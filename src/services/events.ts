import { randomBytes } from "node:crypto";
import { and, asc, count, eq, inArray, isNotNull, isNull, lt } from "drizzle-orm";
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
  /** Set while the event is cancelled; the dashboard shows a badge (deleted events never list). */
  cancelledAt: Date | null;
}

const MAX_TITLE = 100;
const MAX_LOCATION = 200;
const MAX_NAME = 80;
const MAX_INVITEES_PER_CALL = 200;
const SHARE_CODE_ATTEMPTS = 5;
/** Deleted events stay restorable (and visible to nobody but the Undo link) for 30 days. */
export const PURGE_AFTER_DAYS = 30;

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
 * Moves the host's event to the bin and returns its title (for the dashboard's
 * "Deleted …" notice). Nothing is destroyed: guests, plus-ones, dishes, invitees,
 * shopping ticks and extra costs all stay attached, and `restoreEvent` brings the
 * event back for 30 days. After that `purgeDeletedEvents` removes it for good.
 */
export async function deleteEvent(
  db: Db,
  hostId: string,
  eventId: string,
): Promise<{ title: string }> {
  const [deleted] = await db
    .update(events)
    .set({ deletedAt: new Date() })
    .where(
      and(eq(events.id, eventId), eq(events.hostId, hostId), isNull(events.deletedAt)),
    )
    .returning({ title: events.title });
  if (!deleted) throw new NotFoundError("Event not found");
  return deleted;
}

/** Brings a deleted event back, with everything that hung off it. */
export async function restoreEvent(db: Db, hostId: string, eventId: string): Promise<void> {
  const restored = await db
    .update(events)
    .set({ deletedAt: null })
    .where(
      and(eq(events.id, eventId), eq(events.hostId, hostId), isNotNull(events.deletedAt)),
    )
    .returning({ id: events.id });
  if (restored.length === 0) throw new NotFoundError("Event not found");
}

/** The host's own deleted event, or null: used to resolve the dashboard's Undo notice. */
export async function findDeletedHostEvent(
  db: Db,
  hostId: string,
  eventId: string,
): Promise<EventRow | null> {
  const [event] = await db
    .select()
    .from(events)
    .where(
      and(eq(events.id, eventId), eq(events.hostId, hostId), isNotNull(events.deletedAt)),
    );
  return event ?? null;
}

/**
 * Hard-deletes this host's events that were deleted more than 30 days ago.
 * Their children cascade in the database. Runs lazily from the dashboard, so no
 * scheduler is needed; other hosts' bins are untouched.
 */
export async function purgeDeletedEvents(
  db: Db,
  hostId: string,
  now: Date = new Date(),
): Promise<number> {
  const cutoff = new Date(now.getTime() - PURGE_AFTER_DAYS * 24 * 60 * 60 * 1000);
  const purged = await db
    .delete(events)
    .where(
      and(
        eq(events.hostId, hostId),
        isNotNull(events.deletedAt),
        lt(events.deletedAt, cutoff),
      ),
    )
    .returning({ id: events.id });
  return purged.length;
}

/** Cancels the event without deleting it: guests keep the link, with RSVPs closed. */
export async function cancelEvent(db: Db, hostId: string, eventId: string): Promise<void> {
  const cancelled = await db
    .update(events)
    .set({ cancelledAt: new Date() })
    .where(and(eq(events.id, eventId), eq(events.hostId, hostId), isNull(events.deletedAt)))
    .returning({ id: events.id });
  if (cancelled.length === 0) throw new NotFoundError("Event not found");
}

/** Reinstates a cancelled event and reopens RSVPs. */
export async function uncancelEvent(db: Db, hostId: string, eventId: string): Promise<void> {
  const reinstated = await db
    .update(events)
    .set({ cancelledAt: null })
    .where(and(eq(events.id, eventId), eq(events.hostId, hostId), isNull(events.deletedAt)))
    .returning({ id: events.id });
  if (reinstated.length === 0) throw new NotFoundError("Event not found");
}

/**
 * The host's live events, soonest first, each with its planning headcount.
 * Deleted events never list, so the dashboard never shows one.
 */
export async function listHostEvents(db: Db, hostId: string): Promise<EventSummary[]> {
  const rows = await db
    .select()
    .from(events)
    .where(and(eq(events.hostId, hostId), isNull(events.deletedAt)))
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
    cancelledAt: r.cancelledAt,
  }));
}

/** The live event if it belongs to this host, else NotFoundError (never leaks existence). */
export async function getHostEvent(db: Db, hostId: string, eventId: string): Promise<EventRow> {
  const [event] = await db
    .select()
    .from(events)
    .where(
      and(eq(events.id, eventId), eq(events.hostId, hostId), isNull(events.deletedAt)),
    );
  if (!event) throw new NotFoundError("Event not found");
  return event;
}

/** Headcount per live event id, using each event's own maybe percentage. */
export async function headcountForEvents(
  db: Db,
  eventIds: string[],
): Promise<Map<string, Headcount>> {
  const result = new Map<string, Headcount>();
  if (eventIds.length === 0) return result;

  const eventRows = await db
    .select({ id: events.id, maybePercent: events.maybePercent })
    .from(events)
    .where(and(inArray(events.id, eventIds), isNull(events.deletedAt)));
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
