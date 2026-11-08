import { asc, eq, inArray } from "drizzle-orm";
import type { Db } from "@/db/client";
import { events, guests, invitees, plusOnes } from "@/db/schema";
import { computeHeadcount, type Headcount, type RsvpStatus } from "@/domain/headcount";
import { ValidationError } from "./errors";
import { getHostEvent, noReplyNames } from "./events";

export interface GuestRow {
  id: string;
  name: string;
  status: RsvpStatus;
  plusOneNames: string[];
  /** Host-only: never shown on guest-facing pages. */
  foodNotes: string | null;
}

export interface GuestsOverview {
  headcount: Headcount;
  /** Number of guests (not heads) per answer. */
  counts: { yes: number; maybe: number; no: number };
  guests: GuestRow[];
  /** Invitees who have not answered; null when the host never added an invitee list. */
  noReply: string[] | null;
}

/** Everything the host's Guests tab shows. Throws NotFoundError for another host's event. */
export async function getGuestsOverview(
  db: Db,
  hostId: string,
  eventId: string,
): Promise<GuestsOverview> {
  const event = await getHostEvent(db, hostId, eventId);

  const guestRows = await db
    .select()
    .from(guests)
    .where(eq(guests.eventId, eventId))
    .orderBy(asc(guests.createdAt), asc(guests.name));
  const plusOneRows =
    guestRows.length === 0
      ? []
      : await db
          .select({ guestId: plusOnes.guestId, name: plusOnes.name })
          .from(plusOnes)
          .where(
            inArray(
              plusOnes.guestId,
              guestRows.map((g) => g.id),
            ),
          );
  const plusOnesByGuest = new Map<string, string[]>();
  for (const p of plusOneRows) {
    const list = plusOnesByGuest.get(p.guestId) ?? [];
    list.push(p.name);
    plusOnesByGuest.set(p.guestId, list);
  }

  const rows: GuestRow[] = guestRows.map((g) => ({
    id: g.id,
    name: g.name,
    status: g.status,
    plusOneNames: plusOnesByGuest.get(g.id) ?? [],
    foodNotes: g.foodNotes,
  }));

  const counts = { yes: 0, maybe: 0, no: 0 };
  for (const g of rows) counts[g.status] += 1;

  const headcount = computeHeadcount(
    rows.map((g) => ({ status: g.status, plusOnes: g.plusOneNames.length })),
    event.maybePercent / 100,
  );

  const [anyInvitee] = await db
    .select({ id: invitees.id })
    .from(invitees)
    .where(eq(invitees.eventId, eventId))
    .limit(1);
  const noReply = anyInvitee ? await noReplyNames(db, hostId, eventId) : null;

  return { headcount, counts, guests: rows, noReply };
}

/** Sets how much of the maybes to plan for (integer 0..100). Never touches guest statuses. */
export async function setMaybePercent(
  db: Db,
  hostId: string,
  eventId: string,
  percent: number,
): Promise<void> {
  await getHostEvent(db, hostId, eventId);
  if (!Number.isInteger(percent) || percent < 0 || percent > 100) {
    throw new ValidationError("Maybe percent must be a whole number from 0 to 100");
  }
  await db.update(events).set({ maybePercent: percent }).where(eq(events.id, eventId));
}
