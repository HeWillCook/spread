import { and, eq } from "drizzle-orm";
import { z } from "zod";
import type { Db } from "@/db/client";
import { guests, plusOnes } from "@/db/schema";
import { NotFoundError, ValidationError } from "./errors";
import { getHostEvent } from "./events";
import { newEditToken } from "./rsvp";

const MAX_NAME = 80;
const MAX_WALK_IN_PLUS_ONES = 10;

const walkInSchema = z.object({
  name: z.string().trim().min(1, "Enter their name").max(MAX_NAME, `Names can be at most ${MAX_NAME} characters`),
  plusOnes: z
    .number({ error: "Extra people must be a whole number" })
    .int("Extra people must be a whole number")
    .min(0, "Extra people can't be negative")
    .max(MAX_WALK_IN_PLUS_ONES, `At most ${MAX_WALK_IN_PLUS_ONES} extra people`),
});

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

/**
 * Adds someone who turned up without RSVPing: a "yes" guest already ticked as
 * attended, with their extra people stored as "Guest of <name> #n" plus-ones, so
 * they are in the headcount and the split like any other guest.
 */
export async function addWalkIn(
  db: Db,
  hostId: string,
  eventId: string,
  input: { name: string; plusOnes: number },
): Promise<{ guestId: string; editToken: string }> {
  await getHostEvent(db, hostId, eventId);
  const parsed = walkInSchema.safeParse(input);
  if (!parsed.success) {
    throw new ValidationError(parsed.error.issues.map((i) => i.message).join("; "));
  }
  const { name, plusOnes: extra } = parsed.data;
  const editToken = newEditToken();

  const guestId = await db.transaction(async (tx) => {
    const [guest] = await tx
      .insert(guests)
      .values({ eventId, name, status: "yes", attended: true, editToken })
      .returning({ id: guests.id });
    if (extra > 0) {
      await tx.insert(plusOnes).values(
        Array.from({ length: extra }, (_, i) => ({
          guestId: guest.id,
          name: `Guest of ${name} #${i + 1}`,
        })),
      );
    }
    return guest.id;
  });
  return { guestId, editToken };
}
