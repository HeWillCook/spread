import { randomBytes } from "node:crypto";
import { and, asc, count, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import type { Db } from "@/db/client";
import { events, guests, invitees, plusOnes } from "@/db/schema";
import { computeHeadcount, type Headcount, type HeadcountGuest } from "@/domain/headcount";
import { assertTimeZone, zonedLocalToDate } from "@/lib/zoned-time";
import { NotFoundError, ValidationError } from "./errors";

export type EventRow = typeof events.$inferSelect;

export interface CreateEventInput {
  title: string;
  startsAt: Date;
  location: string;
  /** The signed-in host's display name (denormalized onto the event). */
  hostName: string;
  /** IANA zone the host chose the time in. Defaults to UTC. */
  timezone?: string;
}

export interface EventSummary {
  id: string;
  title: string;
  startsAt: Date;
  location: string;
  timezone: string;
  shareCode: string;
  /** Heads to plan for: confirmed yeses plus the expected share of maybes. */
  planFor: number;
}

const MAX_TITLE = 100;
const MAX_LOCATION = 200;
const MAX_NAME = 80;
const MAX_INVITEES_PER_CALL = 200;
const SHARE_CODE_ATTEMPTS = 5;

const detailsShape = {
  title: z.string().trim().min(1, "Give your event a name").max(MAX_TITLE),
  location: z.string().trim().min(1, "Where is it?").max(MAX_LOCATION),
};

const createSchema = z.object({
  ...detailsShape,
  hostName: z.string().trim().min(1).max(MAX_NAME),
  startsAt: z.date().refine((d) => !Number.isNaN(d.getTime()), "Pick a valid date and time"),
  timezone: z.string().min(1).default("UTC"),
});

/** 10 URL-safe characters (~60 bits): unguessable and short enough to paste. */
export function generateShareCode(): string {
  return randomBytes(8).toString("base64url").slice(0, 10);
}

export async function createEvent(
  db: Db,
  hostId: string,
  input: CreateEventInput,
  // Injectable so the collision retry can be tested.
  newShareCode: () => string = generateShareCode,
): Promise<{ id: string; shareCode: string }> {
  const parsed = createSchema.safeParse(input);
  if (!parsed.success) {
    throw new ValidationError(parsed.error.issues.map((i) => i.message).join("; "));
  }
  const data = parsed.data;
  assertTimeZone(data.timezone);

  for (let attempt = 0; attempt < SHARE_CODE_ATTEMPTS; attempt++) {
    const shareCode = newShareCode();
    const [row] = await db
      .insert(events)
      .values({ ...data, hostId, shareCode })
      .onConflictDoNothing({ target: events.shareCode })
      .returning({ id: events.id });
    if (row) return { id: row.id, shareCode };
  }
  throw new Error("Could not generate a unique share code");
}

export interface UpdateEventInput {
  title: string;
  /** Wall-clock `datetime-local` value ("2026-11-14T19:00") in `timezone`. */
  startsAt: string;
  location: string;
  /** IANA zone the time was typed in. Defaults to the event's current zone. */
  timezone?: string;
}

/**
 * Edits an event's title, time and place with the same validation as createEvent.
 * The share code, host name, maybe percent and all RSVPs are left alone.
 */
export async function updateEvent(
  db: Db,
  hostId: string,
  eventId: string,
  input: UpdateEventInput,
): Promise<void> {
  const event = await getHostEvent(db, hostId, eventId);
  const parsed = z.object(detailsShape).safeParse(input);
  if (!parsed.success) {
    throw new ValidationError(parsed.error.issues.map((i) => i.message).join("; "));
  }
  const timezone = input.timezone || event.timezone;
  const startsAt = zonedLocalToDate(input.startsAt, timezone);
  await db
    .update(events)
    .set({ ...parsed.data, startsAt, timezone })
    .where(and(eq(events.id, eventId), eq(events.hostId, hostId)));
}

/**
 * Deletes the host's event and returns its title (for a confirmation message).
 * Every table that hangs off an event — guests and their plus-ones, dishes,
 * invitees, shopping ticks, extra costs — cascades in the database.
 */
export async function deleteEvent(
  db: Db,
  hostId: string,
  eventId: string,
): Promise<{ title: string }> {
  const [deleted] = await db
    .delete(events)
    .where(and(eq(events.id, eventId), eq(events.hostId, hostId)))
    .returning({ title: events.title });
  if (!deleted) throw new NotFoundError("Event not found");
  return deleted;
}

/** The host's events, soonest first, each with its planning headcount. */
export async function listHostEvents(db: Db, hostId: string): Promise<EventSummary[]> {
  const rows = await db
    .select()
    .from(events)
    .where(eq(events.hostId, hostId))
    .orderBy(asc(events.startsAt), asc(events.title));
  const headcounts = await headcountForEvents(
    db,
    rows.map((r) => r.id),
  );
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    startsAt: r.startsAt,
    location: r.location,
    timezone: r.timezone,
    shareCode: r.shareCode,
    planFor: headcounts.get(r.id)?.planFor ?? 0,
  }));
}

/** The event if it belongs to this host; otherwise NotFoundError (never leaks existence). */
export async function getHostEvent(db: Db, hostId: string, eventId: string): Promise<EventRow> {
  const [event] = await db
    .select()
    .from(events)
    .where(and(eq(events.id, eventId), eq(events.hostId, hostId)));
  if (!event) throw new NotFoundError("Event not found");
  return event;
}

/** Headcount per event id, using each event's own maybe percentage. */
export async function headcountForEvents(
  db: Db,
  eventIds: string[],
): Promise<Map<string, Headcount>> {
  const result = new Map<string, Headcount>();
  if (eventIds.length === 0) return result;

  const eventRows = await db
    .select({ id: events.id, maybePercent: events.maybePercent })
    .from(events)
    .where(inArray(events.id, eventIds));
  const guestRows = await db
    .select({ id: guests.id, eventId: guests.eventId, status: guests.status })
    .from(guests)
    .where(inArray(guests.eventId, eventIds));
  const plusOneRows = await db
    .select({ guestId: plusOnes.guestId, n: count() })
    .from(plusOnes)
    .innerJoin(guests, eq(plusOnes.guestId, guests.id))
    .where(inArray(guests.eventId, eventIds))
    .groupBy(plusOnes.guestId);
  const plusOnesByGuest = new Map(plusOneRows.map((r) => [r.guestId, r.n]));

  const byEvent = new Map<string, HeadcountGuest[]>();
  for (const g of guestRows) {
    const list = byEvent.get(g.eventId) ?? [];
    list.push({ status: g.status, plusOnes: plusOnesByGuest.get(g.id) ?? 0 });
    byEvent.set(g.eventId, list);
  }
  for (const e of eventRows) {
    result.set(e.id, computeHeadcount(byEvent.get(e.id) ?? [], e.maybePercent / 100));
  }
  return result;
}

const nameKey = (name: string) => name.trim().toLowerCase();

/** Adds expected invitees: trimmed, blanks dropped, no case-insensitive duplicates. */
export async function addInvitees(
  db: Db,
  hostId: string,
  eventId: string,
  names: string[],
): Promise<void> {
  await getHostEvent(db, hostId, eventId);
  if (names.length > MAX_INVITEES_PER_CALL) throw new ValidationError("Too many names at once");

  const existing = await db
    .select({ name: invitees.name })
    .from(invitees)
    .where(eq(invitees.eventId, eventId));
  const seen = new Set(existing.map((r) => nameKey(r.name)));

  const toAdd: string[] = [];
  for (const raw of names) {
    const name = raw.trim();
    if (!name) continue;
    if (name.length > MAX_NAME) throw new ValidationError(`Names can be at most ${MAX_NAME} characters`);
    if (seen.has(nameKey(name))) continue;
    seen.add(nameKey(name));
    toAdd.push(name);
  }
  if (toAdd.length > 0) {
    await db.insert(invitees).values(toAdd.map((name) => ({ eventId, name })));
  }
}

/** Invitees with no guest of the same trimmed, case-insensitive name. */
export async function noReplyNames(db: Db, hostId: string, eventId: string): Promise<string[]> {
  await getHostEvent(db, hostId, eventId);
  const [invited, replied] = await Promise.all([
    db.select({ name: invitees.name }).from(invitees).where(eq(invitees.eventId, eventId)),
    db.select({ name: guests.name }).from(guests).where(eq(guests.eventId, eventId)),
  ]);
  const repliedKeys = new Set(replied.map((g) => nameKey(g.name)));
  return invited.map((i) => i.name).filter((name) => !repliedKeys.has(nameKey(name)));
}
