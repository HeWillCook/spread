import { and, asc, eq } from "drizzle-orm";
import type { Db } from "@/db/client";
import { events, guests, plusOnes } from "@/db/schema";
import { formatCents } from "@/domain/money";
import { computeSplit } from "@/domain/split";
import { venmoPayLink } from "@/domain/venmo";
import { NotFoundError, ValidationError } from "./errors";
import { getHostEvent } from "./events";
import { getShoppingPlan } from "./shopping";

export interface SplitRow {
  guestId: string;
  name: string;
  attended: boolean;
  excluded: boolean;
  paid: boolean;
  linkSentAt: Date | null;
  /** The guest plus their plus-ones: the inviting guest covers their plus-ones' shares. */
  heads: number;
  owedCents: number;
  venmoUrl: string | null;
}

export interface SplitView {
  /** Used in the message the host sends with each guest's Venmo link. */
  eventTitle: string;
  rows: SplitRow[];
  totalCents: number;
  hostCoveredCents: number;
  unassignedCents: number;
  venmoUsername: string | null;
}

// Sanity ceiling, same as the shopping tab, so a typo can't overflow the integer column.
const MAX_CENTS = 1_000_000;
// Venmo usernames: letters, digits, hyphen and underscore, 5 to 30 characters.
const VENMO_USERNAME = /^[A-Za-z0-9_-]{5,30}$/;

/**
 * Everything the Split tab shows. Throws NotFoundError for another host's event.
 *
 * Rows: every guest who isn't a "no", plus any "no" the host ticked as attended
 * (someone can say no and turn up anyway). Only attended guests are in the split;
 * everyone else shows owedCents 0. Excluded guests (e.g. kids) owe 0 and their
 * heads are not counted, so the others pick up the difference.
 */
export async function getSplitView(db: Db, hostId: string, eventId: string): Promise<SplitView> {
  const event = await getHostEvent(db, hostId, eventId);
  const [plan, guestRows, plusOneRows] = await Promise.all([
    getShoppingPlan(db, hostId, eventId),
    db.select().from(guests).where(eq(guests.eventId, eventId)).orderBy(asc(guests.createdAt), asc(guests.name)),
    db
      .select({ guestId: plusOnes.guestId })
      .from(plusOnes)
      .innerJoin(guests, eq(plusOnes.guestId, guests.id))
      .where(eq(guests.eventId, eventId)),
  ]);

  const plusOneCount = new Map<string, number>();
  for (const p of plusOneRows) plusOneCount.set(p.guestId, (plusOneCount.get(p.guestId) ?? 0) + 1);

  const listed = guestRows
    .filter((g) => g.status !== "no" || g.attended)
    .map((g) => ({ guest: g, heads: 1 + (plusOneCount.get(g.id) ?? 0) }));

  const split = computeSplit(
    plan.totalCents,
    listed
      .filter(({ guest }) => guest.attended)
      .map(({ guest, heads }) => ({
        id: guest.id,
        name: guest.name,
        heads,
        excluded: guest.excluded,
      })),
    event.hostCoverCents,
  );
  const owedById = new Map(split.shares.map((s) => [s.guestId, s.owedCents]));

  const rows = listed.map(({ guest, heads }): SplitRow => {
    const owedCents = owedById.get(guest.id) ?? 0;
    const venmoUrl =
      event.venmoUsername && guest.attended && owedCents > 0
        ? venmoPayLink({
            username: event.venmoUsername,
            amountCents: owedCents,
            note: `${event.title}: your share`,
          })
        : null;
    return {
      guestId: guest.id,
      name: guest.name,
      attended: guest.attended,
      excluded: guest.excluded,
      paid: guest.paid,
      linkSentAt: guest.linkSentAt,
      heads,
      owedCents,
      venmoUrl,
    };
  });

  return {
    eventTitle: event.title,
    rows,
    totalCents: plan.totalCents,
    hostCoveredCents: split.hostCoveredCents,
    unassignedCents: split.unassignedCents,
    venmoUsername: event.venmoUsername,
  };
}

/** Updates one guest of THIS event; a guest from any other event is a NotFoundError. */
async function updateGuest(
  db: Db,
  hostId: string,
  eventId: string,
  guestId: string,
  values: Partial<Pick<typeof guests.$inferInsert, "attended" | "excluded" | "paid" | "linkSentAt">>,
): Promise<void> {
  await getHostEvent(db, hostId, eventId);
  const updated = await db
    .update(guests)
    .set(values)
    .where(and(eq(guests.id, guestId), eq(guests.eventId, eventId)))
    .returning({ id: guests.id });
  if (updated.length === 0) throw new NotFoundError("Guest not found");
}

// None of these touch a guest's yes/maybe/no status: attendance and exclusion only
// matter to the split, never to the headcount or the shopping list.

export function setAttended(db: Db, hostId: string, eventId: string, guestId: string, v: boolean) {
  return updateGuest(db, hostId, eventId, guestId, { attended: v });
}

export function setExcluded(db: Db, hostId: string, eventId: string, guestId: string, v: boolean) {
  return updateGuest(db, hostId, eventId, guestId, { excluded: v });
}

export function setPaid(db: Db, hostId: string, eventId: string, guestId: string, v: boolean) {
  return updateGuest(db, hostId, eventId, guestId, { paid: v });
}

/** Records that the host shared this guest's Venmo link (the share or copy succeeded). */
export function markLinkSent(db: Db, hostId: string, eventId: string, guestId: string) {
  return updateGuest(db, hostId, eventId, guestId, { linkSentAt: new Date() });
}

/** How much of the bill the host pays. More than the total is allowed; the split clamps it. */
export async function setHostCover(
  db: Db,
  hostId: string,
  eventId: string,
  cents: number,
): Promise<void> {
  await getHostEvent(db, hostId, eventId);
  if (!Number.isInteger(cents) || cents < 0 || cents > MAX_CENTS) {
    throw new ValidationError(`Amount must be between $0.00 and ${formatCents(MAX_CENTS)}`);
  }
  await db.update(events).set({ hostCoverCents: cents }).where(eq(events.id, eventId));
}

/** The host's Venmo name. A leading @ is dropped; blank or null clears it. */
export async function setVenmoUsername(
  db: Db,
  hostId: string,
  eventId: string,
  username: string | null,
): Promise<void> {
  await getHostEvent(db, hostId, eventId);
  const clean = (typeof username === "string" ? username.trim() : "").replace(/^@/, "");
  if (clean !== "" && !VENMO_USERNAME.test(clean)) {
    throw new ValidationError(
      "Venmo usernames are 5 to 30 letters, numbers, dashes or underscores",
    );
  }
  await db
    .update(events)
    .set({ venmoUsername: clean === "" ? null : clean })
    .where(eq(events.id, eventId));
}
