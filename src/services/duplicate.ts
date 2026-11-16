import { and, eq, isNull } from "drizzle-orm";
import type { Db } from "@/db/client";
import { eventDishes, events, guests, invitees } from "@/db/schema";
import { dateToZonedLocal, zonedLocalToDate } from "@/lib/zoned-time";
import { NotFoundError } from "./errors";
import { generateShareCode } from "./events";

const SHARE_CODE_ATTEMPTS = 5;

export interface DuplicateEventOptions {
  /** Injectable "now" so the start-date rule is testable. */
  now?: Date;
  /** Injectable share-code generator, like createEvent's. */
  newShareCode?: () => string;
}

const nameKey = (name: string) => name.trim().toLowerCase();

/** Adds whole days to a "YYYY-MM-DD" date without a time zone getting in the way. */
function addDays(date: string, days: number): string {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

/**
 * The same weekday and wall-clock time one week after `later`, read in the event's
 * own zone so a DST change in the middle doesn't shift the party by an hour.
 */
function oneWeekLater(later: Date, timezone: string): Date {
  const local = dateToZonedLocal(later, timezone);
  const date = local.slice(0, 10);
  const time = local.slice(11);
  return zonedLocalToDate(`${addDays(date, 7)}T${time}`, timezone);
}

/**
 * Copies an event's plan into a fresh one ("Plan this again"), in a transaction.
 *
 * Copied: title + " (again)", location, timezone, maybe percent, Venmo username,
 * host cover, menu dishes (with their portions) and invitees (the old invitee list
 * plus everyone on the old guest list, deduped case-insensitively).
 *
 * Not copied: RSVPs, plus-ones, shopping ticks and prices, extra costs, cover
 * columns, and the cancelled/deleted/updated markers.
 *
 * The new start is the same weekday and time one week after the later of the old
 * start and now, so a past party lands in the coming week rather than in the past.
 * The event id is bound on the client and cannot be trusted, so the source is
 * looked up by host id too; a deleted or foreign event is a NotFoundError.
 */
export async function duplicateEvent(
  db: Db,
  hostId: string,
  eventId: string,
  options: DuplicateEventOptions = {},
): Promise<{ id: string; shareCode: string }> {
  const now = options.now ?? new Date();
  const newShareCode = options.newShareCode ?? generateShareCode;

  const [source] = await db
    .select()
    .from(events)
    .where(and(eq(events.id, eventId), eq(events.hostId, hostId), isNull(events.deletedAt)));
  if (!source) throw new NotFoundError("Event not found");

  const [sourceInvitees, sourceGuests, sourceDishes] = await Promise.all([
    db.select({ name: invitees.name }).from(invitees).where(eq(invitees.eventId, eventId)),
    db.select({ name: guests.name }).from(guests).where(eq(guests.eventId, eventId)),
    db
      .select({
        recipeId: eventDishes.recipeId,
        servingsPerPerson: eventDishes.servingsPerPerson,
      })
      .from(eventDishes)
      .where(eq(eventDishes.eventId, eventId)),
  ]);

  // The old guest list may already contain someone who was also an invitee; keep
  // the first spelling and one row per person.
  const seen = new Set<string>();
  const names: string[] = [];
  for (const name of [
    ...sourceInvitees.map((row) => row.name),
    ...sourceGuests.map((row) => row.name),
  ]) {
    const key = nameKey(name);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    names.push(name.trim());
  }

  const later = source.startsAt.getTime() > now.getTime() ? source.startsAt : now;
  const startsAt = oneWeekLater(later, source.timezone);

  return db.transaction(async (tx) => {
    for (let attempt = 0; attempt < SHARE_CODE_ATTEMPTS; attempt++) {
      const shareCode = newShareCode();
      const [row] = await tx
        .insert(events)
        .values({
          hostId,
          hostName: source.hostName,
          title: `${source.title} (again)`,
          startsAt,
          location: source.location,
          timezone: source.timezone,
          shareCode,
          maybePercent: source.maybePercent,
          venmoUsername: source.venmoUsername,
          hostCoverCents: source.hostCoverCents,
        })
        .onConflictDoNothing({ target: events.shareCode })
        .returning({ id: events.id });
      if (!row) continue;

      if (sourceDishes.length > 0) {
        await tx.insert(eventDishes).values(
          sourceDishes.map((dish) => ({
            eventId: row.id,
            recipeId: dish.recipeId,
            servingsPerPerson: dish.servingsPerPerson,
          })),
        );
      }
      if (names.length > 0) {
        await tx.insert(invitees).values(names.map((name) => ({ eventId: row.id, name })));
      }
      return { id: row.id, shareCode };
    }
    throw new Error("Could not generate a unique share code");
  });
}
