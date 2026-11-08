// @vitest-environment node
import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import type { Db } from "@/db/client";
import { guests, plusOnes, shoppingState } from "@/db/schema";
import { createTestDb } from "@/db/test-db";
import { NotFoundError } from "./errors";
import { createEvent } from "./events";
import { removeGuest } from "./guestAdmin";
import { getGuestsOverview } from "./guestsOverview";
import { submitRsvp } from "./rsvp";

let db: Db;
let eventId: string;
let shareCode: string;

beforeEach(async () => {
  db = await createTestDb();
  ({ id: eventId, shareCode } = await createEvent(db, "host-1", {
    title: "Cookout",
    startsAt: new Date("2026-07-04T18:00:00Z"),
    location: "Backyard",
    hostName: "Will",
  }));
});

describe("removeGuest", () => {
  it("removes the guest and their plus-ones, and the headcount drops", async () => {
    const { guestId } = await submitRsvp(db, {
      shareCode,
      name: "Alex",
      status: "yes",
      plusOneNames: ["Sam", "Pat"],
    });
    await submitRsvp(db, { shareCode, name: "Bea", status: "yes", plusOneNames: [] });
    expect((await getGuestsOverview(db, "host-1", eventId)).headcount.confirmed).toBe(4);

    await removeGuest(db, "host-1", eventId, guestId);

    const overview = await getGuestsOverview(db, "host-1", eventId);
    expect(overview.guests.map((g) => g.name)).toEqual(["Bea"]);
    expect(overview.headcount.confirmed).toBe(1);
    expect(await db.select().from(plusOnes).where(eq(plusOnes.guestId, guestId))).toEqual([]);
    expect(await db.select().from(plusOnes)).toEqual([]);
  });

  it("removes only that guest and leaves the other tables alone", async () => {
    const { guestId } = await submitRsvp(db, { shareCode, name: "Alex", status: "yes", plusOneNames: [] });
    const { guestId: keepId } = await submitRsvp(db, {
      shareCode,
      name: "Bea",
      status: "maybe",
      plusOneNames: ["Bo"],
    });
    const before = await db.select().from(shoppingState);

    await removeGuest(db, "host-1", eventId, guestId);

    expect((await db.select().from(guests)).map((g) => g.id)).toEqual([keepId]);
    expect(await db.select().from(plusOnes)).toHaveLength(1);
    expect(await db.select().from(shoppingState)).toEqual(before);
    // The event itself is untouched.
    expect((await getGuestsOverview(db, "host-1", eventId)).counts).toEqual({ yes: 0, maybe: 1, no: 0 });
  });

  it("is a NotFoundError for another host and deletes nothing", async () => {
    const { guestId } = await submitRsvp(db, { shareCode, name: "Alex", status: "yes", plusOneNames: ["Sam"] });
    await expect(removeGuest(db, "host-2", eventId, guestId)).rejects.toBeInstanceOf(NotFoundError);
    expect(await db.select().from(guests)).toHaveLength(1);
    expect(await db.select().from(plusOnes)).toHaveLength(1);
  });

  it("is a NotFoundError for a guest of another event, which stays untouched", async () => {
    const other = await createEvent(db, "host-1", {
      title: "Other",
      startsAt: new Date("2026-08-04T18:00:00Z"),
      location: "Park",
      hostName: "Will",
    });
    const { guestId: foreign } = await submitRsvp(db, {
      shareCode: other.shareCode,
      name: "Zed",
      status: "yes",
      plusOneNames: ["Zoe"],
    });
    await expect(removeGuest(db, "host-1", eventId, foreign)).rejects.toBeInstanceOf(NotFoundError);
    expect(await db.select().from(guests).where(eq(guests.id, foreign))).toHaveLength(1);
    expect(await db.select().from(plusOnes).where(eq(plusOnes.guestId, foreign))).toHaveLength(1);
  });

  it("is a NotFoundError for an id that doesn't exist", async () => {
    await expect(removeGuest(db, "host-1", eventId, "nope")).rejects.toBeInstanceOf(NotFoundError);
  });
});
