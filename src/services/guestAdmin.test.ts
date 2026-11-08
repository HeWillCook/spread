// @vitest-environment node
import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import type { Db } from "@/db/client";
import { guests, plusOnes, shoppingState } from "@/db/schema";
import { createTestDb } from "@/db/test-db";
import { NotFoundError, ValidationError } from "./errors";
import { createEvent } from "./events";
import { addWalkIn, removeGuest } from "./guestAdmin";
import { getGuestsOverview } from "./guestsOverview";
import { submitRsvp } from "./rsvp";
import { getSplitView } from "./split";

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

describe("addWalkIn", () => {
  it("adds an attended 'yes' guest with numbered plus-ones and a fresh edit token", async () => {
    const { guestId, editToken } = await addWalkIn(db, "host-1", eventId, { name: "  Dana  ", plusOnes: 2 });

    const [guest] = await db.select().from(guests).where(eq(guests.id, guestId));
    expect(guest).toMatchObject({
      eventId,
      name: "Dana",
      status: "yes",
      attended: true,
      excluded: false,
      paid: false,
    });
    expect(guest.editToken).toBe(editToken);
    expect(editToken.length).toBeGreaterThanOrEqual(24);
    const names = (await db.select().from(plusOnes).where(eq(plusOnes.guestId, guestId))).map((p) => p.name);
    expect(names.sort()).toEqual(["Guest of Dana #1", "Guest of Dana #2"]);
  });

  it("gives two walk-ins different edit tokens", async () => {
    const a = await addWalkIn(db, "host-1", eventId, { name: "A", plusOnes: 0 });
    const b = await addWalkIn(db, "host-1", eventId, { name: "B", plusOnes: 0 });
    expect(a.editToken).not.toBe(b.editToken);
  });

  it("counts toward the headcount and appears in the split as attended", async () => {
    await addWalkIn(db, "host-1", eventId, { name: "Dana", plusOnes: 1 });
    expect((await getGuestsOverview(db, "host-1", eventId)).headcount.confirmed).toBe(2);

    const view = await getSplitView(db, "host-1", eventId);
    expect(view.rows).toHaveLength(1);
    expect(view.rows[0]).toMatchObject({ name: "Dana", attended: true, heads: 2 });
    expect(view.saidNo).toEqual([]);
  });

  it("rejects a blank or over-long name and a bad plus-one count, adding nothing", async () => {
    for (const bad of [
      { name: "   ", plusOnes: 0 },
      { name: "x".repeat(81), plusOnes: 0 },
      { name: "Dana", plusOnes: -1 },
      { name: "Dana", plusOnes: 11 },
      { name: "Dana", plusOnes: 1.5 },
      { name: "Dana", plusOnes: Number.NaN },
    ]) {
      await expect(addWalkIn(db, "host-1", eventId, bad)).rejects.toBeInstanceOf(ValidationError);
    }
    expect(await db.select().from(guests)).toEqual([]);
  });

  it("allows the limits: an 80-character name and 10 plus-ones", async () => {
    const { guestId } = await addWalkIn(db, "host-1", eventId, { name: "n".repeat(80), plusOnes: 10 });
    expect(await db.select().from(plusOnes).where(eq(plusOnes.guestId, guestId))).toHaveLength(10);
  });

  it("is a NotFoundError for another host and adds nothing", async () => {
    await expect(addWalkIn(db, "host-2", eventId, { name: "Dana", plusOnes: 0 })).rejects.toBeInstanceOf(
      NotFoundError,
    );
    expect(await db.select().from(guests)).toEqual([]);
  });
});
