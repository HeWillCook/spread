import { randomBytes } from "node:crypto";
import { and, count, eq } from "drizzle-orm";
import { z } from "zod";
import type { Db } from "@/db/client";
import { events, guests, plusOnes } from "@/db/schema";
import type { RsvpStatus } from "@/domain/headcount";
import { NotFoundError, ValidationError } from "./errors";

export interface RsvpInput {
  shareCode: string;
  name: string;
  status: RsvpStatus;
  plusOneNames: string[];
  foodNotes?: string;
}

export interface GuestView {
  id: string;
  name: string;
  status: RsvpStatus;
  plusOneNames: string[];
  foodNotes: string | null;
}

const MAX_NAME = 80;
const MAX_PLUS_ONES = 10;
const MAX_FOOD_NOTES = 500;
// Raw input cap so a hostile client can't send an enormous array of blanks.
const MAX_RAW_PLUS_ONES = 50;

const rsvpSchema = z.object({
  shareCode: z.string().min(1),
  name: z.string().trim().min(1).max(MAX_NAME),
  status: z.enum(["yes", "maybe", "no"]),
  plusOneNames: z
    .array(z.string().trim().max(MAX_NAME))
    .max(MAX_RAW_PLUS_ONES)
    .transform((names) => names.filter((n) => n.length > 0))
    .pipe(z.array(z.string()).max(MAX_PLUS_ONES)),
  foodNotes: z
    .string()
    .trim()
    .max(MAX_FOOD_NOTES)
    .optional()
    .transform((notes) => (notes ? notes : null)),
});

function parseInput(input: RsvpInput) {
  const result = rsvpSchema.safeParse(input);
  if (!result.success) {
    throw new ValidationError(result.error.issues.map((i) => i.message).join("; "));
  }
  return result.data;
}

/** A fresh, unguessable guest edit token (192 random bits, URL-safe). */
export function newEditToken(): string {
  return randomBytes(24).toString("base64url");
}

/** What a public guest page may show. Never guest names or food notes. */
export interface PublicEvent {
  title: string;
  startsAt: Date;
  location: string;
  /** IANA zone the event time should be shown in. */
  timezone: string;
  hostName: string;
  goingCount: number;
  /** Set while the host has called the event off: the page renders read-only. */
  cancelledAt: Date | null;
  /** Set while the event is in the bin: the page shows "no longer available". */
  deletedAt: Date | null;
}

const RSVP_CLOSED_DELETED = "This event is no longer available.";
const RSVP_CLOSED_CANCELLED = "This event was cancelled, so RSVPs are closed.";

/** Deleted and cancelled events take no RSVPs, even from a stale tab or a crafted POST. */
function assertRsvpOpen(event: { cancelledAt: Date | null; deletedAt: Date | null }): void {
  if (event.deletedAt) throw new ValidationError(RSVP_CLOSED_DELETED);
  if (event.cancelledAt) throw new ValidationError(RSVP_CLOSED_CANCELLED);
}

async function findEventId(
  db: Db,
  shareCode: string,
): Promise<{ id: string; cancelledAt: Date | null; deletedAt: Date | null }> {
  const [event] = await db
    .select({ id: events.id, cancelledAt: events.cancelledAt, deletedAt: events.deletedAt })
    .from(events)
    .where(eq(events.shareCode, shareCode));
  if (!event) throw new NotFoundError("Event not found");
  return event;
}

/** A guest only matches when the token AND the event's share code both match. */
async function findGuestId(
  db: Db,
  shareCode: string,
  editToken: string,
): Promise<{ id: string; cancelledAt: Date | null; deletedAt: Date | null }> {
  const [row] = await db
    .select({
      id: guests.id,
      cancelledAt: events.cancelledAt,
      deletedAt: events.deletedAt,
    })
    .from(guests)
    .innerJoin(events, eq(guests.eventId, events.id))
    .where(and(eq(events.shareCode, shareCode), eq(guests.editToken, editToken)));
  if (!row) throw new NotFoundError("RSVP not found");
  return row;
}

export async function submitRsvp(
  db: Db,
  input: RsvpInput,
): Promise<{ guestId: string; editToken: string }> {
  const data = parseInput(input);
  const event = await findEventId(db, data.shareCode);
  assertRsvpOpen(event);
  const eventId = event.id;
  const editToken = newEditToken();

  const guestId = await db.transaction(async (tx) => {
    const [guest] = await tx
      .insert(guests)
      .values({
        eventId,
        name: data.name,
        status: data.status,
        foodNotes: data.foodNotes,
        editToken,
      })
      .returning({ id: guests.id });
    if (data.plusOneNames.length > 0) {
      await tx
        .insert(plusOnes)
        .values(data.plusOneNames.map((name) => ({ guestId: guest.id, name })));
    }
    return guest.id;
  });

  return { guestId, editToken };
}

export async function updateRsvp(db: Db, input: RsvpInput & { editToken: string }): Promise<void> {
  const data = parseInput(input);
  const guest = await findGuestId(db, data.shareCode, input.editToken);
  assertRsvpOpen(guest);
  const guestId = guest.id;

  await db.transaction(async (tx) => {
    await tx
      .update(guests)
      .set({ name: data.name, status: data.status, foodNotes: data.foodNotes })
      .where(eq(guests.id, guestId));
    await tx.delete(plusOnes).where(eq(plusOnes.guestId, guestId));
    if (data.plusOneNames.length > 0) {
      await tx.insert(plusOnes).values(data.plusOneNames.map((name) => ({ guestId, name })));
    }
  });
}

export async function getGuestByToken(
  db: Db,
  shareCode: string,
  editToken: string,
): Promise<GuestView> {
  const guestId = (await findGuestId(db, shareCode, editToken)).id;
  const [guest] = await db.select().from(guests).where(eq(guests.id, guestId));
  const pos = await db.select({ name: plusOnes.name }).from(plusOnes).where(eq(plusOnes.guestId, guestId));
  return {
    id: guest.id,
    name: guest.name,
    status: guest.status,
    plusOneNames: pos.map((p) => p.name),
    foodNotes: guest.foodNotes,
  };
}

/**
 * Public-safe event details: no guest names, no food notes. A deleted event is
 * still found so the guest page can say "no longer available" (with the host's
 * name) instead of a bare 404.
 */
export async function getPublicEvent(db: Db, shareCode: string): Promise<PublicEvent> {
  const [event] = await db.select().from(events).where(eq(events.shareCode, shareCode));
  if (!event) throw new NotFoundError("Event not found");

  if (event.deletedAt) {
    return {
      title: event.title,
      startsAt: event.startsAt,
      location: event.location,
      timezone: event.timezone,
      hostName: event.hostName,
      goingCount: 0,
      cancelledAt: event.cancelledAt,
      deletedAt: event.deletedAt,
    };
  }

  const [{ yesGuests }] = await db
    .select({ yesGuests: count() })
    .from(guests)
    .where(and(eq(guests.eventId, event.id), eq(guests.status, "yes")));
  const [{ yesPlusOnes }] = await db
    .select({ yesPlusOnes: count() })
    .from(plusOnes)
    .innerJoin(guests, eq(plusOnes.guestId, guests.id))
    .where(and(eq(guests.eventId, event.id), eq(guests.status, "yes")));

  return {
    title: event.title,
    startsAt: event.startsAt,
    location: event.location,
    timezone: event.timezone,
    hostName: event.hostName,
    goingCount: yesGuests + yesPlusOnes,
    cancelledAt: event.cancelledAt,
    deletedAt: event.deletedAt,
  };
}
