import { asc, eq } from "drizzle-orm";
import { z } from "zod";
import type { Db } from "@/db/client";
import { guests, plusOnes } from "@/db/schema";
import { ValidationError } from "./errors";
import { getHostEvent } from "./events";
import { newEditToken } from "./rsvp";

export interface DevGuestInput {
  name: string;
  status: "yes" | "maybe" | "no";
  plusOneNames?: string[];
  foodNotes?: string;
  attended?: boolean;
  paid?: boolean;
  excluded?: boolean;
}

const MAX_NAME = 80;
const MAX_PLUS_ONES = 10;
const MAX_FOOD_NOTES = 500;

const inputSchema = z.object({
  name: z.string().trim().min(1, "Enter a name").max(MAX_NAME, `Names can be at most ${MAX_NAME} characters`),
  status: z.enum(["yes", "maybe", "no"]),
  plusOneNames: z
    .array(z.string().trim().max(MAX_NAME))
    .max(MAX_PLUS_ONES, `At most ${MAX_PLUS_ONES} plus-ones`)
    .default([])
    .transform((names) => names.filter((name) => name.length > 0)),
  foodNotes: z
    .string()
    .trim()
    .max(MAX_FOOD_NOTES, `Food notes can be at most ${MAX_FOOD_NOTES} characters`)
    .optional()
    .transform((notes) => (notes ? notes : null)),
  attended: z.boolean().default(false),
  paid: z.boolean().default(false),
  excluded: z.boolean().default(false),
});

/**
 * Adds a guest directly, exactly as if they had RSVP'd, so a developer can test the
 * headcount, menu, shopping and split without opening several browsers. Unlike a real
 * RSVP this trusts the caller completely: it never sends a cookie or rate limits.
 */
export async function addDevGuest(
  db: Db,
  hostId: string,
  eventId: string,
  input: DevGuestInput,
): Promise<{ guestId: string; editToken: string }> {
  await getHostEvent(db, hostId, eventId);
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) {
    throw new ValidationError(parsed.error.issues.map((issue) => issue.message).join("; "));
  }
  const { name, status, plusOneNames, foodNotes, attended, paid, excluded } = parsed.data;
  const editToken = newEditToken();

  const guestId = await db.transaction(async (tx) => {
    const [row] = await tx
      .insert(guests)
      .values({
        eventId,
        name,
        status,
        foodNotes,
        editToken,
        attended: status === "yes" ? attended : false,
        paid,
        excluded,
      })
      .returning({ id: guests.id });
    if (plusOneNames.length > 0) {
      await tx.insert(plusOnes).values(plusOneNames.map((plusOne) => ({ guestId: row.id, name: plusOne })));
    }
    return row.id;
  });

  return { guestId, editToken };
}

const CROWD_NAMES = [
  "Avery Stone",
  "Blake Rivera",
  "Casey Nguyen",
  "Drew Patel",
  "Emerson Lee",
  "Frankie Ortiz",
  "Gray Kim",
  "Harper Brooks",
  "Indigo Shah",
  "Jules Martin",
  "Kai Foster",
  "Lane Whitaker",
  "Marlow Chen",
  "Noor Hassan",
  "Oakley Reed",
  "Parker Diaz",
  "Quinn Adler",
  "Reese Walker",
  "Sage Bennett",
  "Tatum Flores",
  "Uma Rao",
  "Vale Moreno",
  "Wren Bailey",
  "Xan Coleman",
  "Yuki Tanaka",
  "Zion Price",
];

/** A deterministic mix: ~60% yes, ~25% maybe, ~15% no, with a few named plus-ones. */
export async function addDevCrowd(
  db: Db,
  hostId: string,
  eventId: string,
  count: number,
): Promise<{ added: number }> {
  await getHostEvent(db, hostId, eventId);
  if (!Number.isInteger(count) || count < 1 || count > 40) {
    throw new ValidationError("A test crowd can be 1 to 40 people");
  }

  for (let i = 0; i < count; i++) {
    // 60% yes, 20% maybe, 20% no, so small presets still show a realistic mix.
    const bucket = i % 5;
    const status = bucket < 3 ? "yes" : bucket === 3 ? "maybe" : "no";
    const name = i < CROWD_NAMES.length ? CROWD_NAMES[i] : `${CROWD_NAMES[i % CROWD_NAMES.length]} ${Math.floor(i / CROWD_NAMES.length) + 1}`;
    const plusOneNames: string[] = [];
    if (status === "yes" && i % 3 === 1) plusOneNames.push(`${name.split(" ")[0]}'s plus-one`);
    if (status === "maybe" && i % 2 === 0) plusOneNames.push(`${name.split(" ")[0]}'s partner`);
    await addDevGuest(db, hostId, eventId, {
      name,
      status,
      plusOneNames,
      foodNotes: status !== "no" && i % 9 === 0 ? "Vegetarian" : undefined,
    });
  }
  return { added: count };
}

/** One going (with a plus-one and a note), one maybe (with a plus-one), one can't. */
export async function addDevSampleSet(
  db: Db,
  hostId: string,
  eventId: string,
): Promise<{ added: number }> {
  await getHostEvent(db, hostId, eventId);
  await addDevGuest(db, hostId, eventId, {
    name: "Alex Chen",
    status: "yes",
    plusOneNames: ["Sam Chen"],
    foodNotes: "Peanut allergy — keep sauces separate",
  });
  await addDevGuest(db, hostId, eventId, {
    name: "Jordan Patel",
    status: "maybe",
    plusOneNames: ["Riley Patel"],
    foodNotes: "Vegetarian",
  });
  await addDevGuest(db, hostId, eventId, { name: "Taylor Brooks", status: "no" });
  return { added: 3 };
}

/** Removes every guest on this event (and their plus-ones). Other events are untouched. */
export async function clearDevGuests(db: Db, hostId: string, eventId: string): Promise<{ removed: number }> {
  await getHostEvent(db, hostId, eventId);
  const removed = await db
    .delete(guests)
    .where(eq(guests.eventId, eventId))
    .returning({ id: guests.id });
  return { removed: removed.length };
}

export interface DevGuestLink {
  id: string;
  name: string;
  status: "yes" | "maybe" | "no";
  url: string;
}

/** Personal edit links, so a developer can inspect any guest's answered page. */
export async function listDevGuestLinks(
  db: Db,
  hostId: string,
  eventId: string,
  shareCode: string,
  baseUrl: string,
): Promise<DevGuestLink[]> {
  await getHostEvent(db, hostId, eventId);
  const rows = await db
    .select({ id: guests.id, name: guests.name, status: guests.status, editToken: guests.editToken })
    .from(guests)
    .where(eq(guests.eventId, eventId))
    .orderBy(asc(guests.createdAt), asc(guests.name));
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    status: row.status,
    url: `${baseUrl}/e/${encodeURIComponent(shareCode)}/g/${encodeURIComponent(row.editToken)}`,
  }));
}
