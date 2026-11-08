import { and, eq } from "drizzle-orm";
import type { Db } from "@/db/client";
import { guests } from "@/db/schema";
import { NotFoundError } from "./errors";
import { getHostEvent } from "./events";

/**
 * Removes one guest of THIS event (e.g. a duplicate RSVP). Their plus-ones go with
 * them (ON DELETE CASCADE on plus_ones.guest_id); nothing else is touched.
 * A guest of another event, or an unknown id, is a NotFoundError.
 */
export async function removeGuest(
  db: Db,
  hostId: string,
  eventId: string,
  guestId: string,
): Promise<void> {
  await getHostEvent(db, hostId, eventId);
  const deleted = await db
    .delete(guests)
    .where(and(eq(guests.id, guestId), eq(guests.eventId, eventId)))
    .returning({ id: guests.id });
  if (deleted.length === 0) throw new NotFoundError("Guest not found");
}
