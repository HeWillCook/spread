// @vitest-environment node
import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import type { Db } from "@/db/client";
import {
  eventDishes,
  events,
  extraCosts,
  guests,
  invitees,
  plusOnes,
  shoppingState,
} from "@/db/schema";
import { seedStarterRecipes } from "@/db/seed";
import { createTestDb } from "@/db/test-db";
import { NotFoundError } from "./errors";
import { duplicateEvent } from "./duplicate";
import { addInvitees, createEvent, getHostEvent } from "./events";
import { addDishToEvent } from "./menu";
import { submitRsvp } from "./rsvp";
import { setChecked } from "./shopping";

let db: Db;

beforeEach(async () => {
  db = await createTestDb();
  await seedStarterRecipes(db);
});

const input = {
  title: "Fourth of July",
  startsAt: new Date("2026-07-04T18:00:00Z"),
  location: "Backyard",
  hostName: "Will",
  timezone: "America/Chicago",
};

async function makeSource() {
  const { id, shareCode } = await createEvent(db, "host-1", input);
  await db
    .update(events)
    .set({
      maybePercent: 80,
      venmoUsername: "will-cooks",
      hostCoverCents: 1500,
      coverEmoji: "🎉",
      coverColor: "mustard",
      detailsChangedAt: new Date("2026-07-01T12:00:00Z"),
    })
    .where(eq(events.id, id));
  return { id, shareCode };
}

describe("duplicateEvent", () => {
  it("copies the plan fields into a new event with ' (again)' in the title", async () => {
    const { id, shareCode } = await makeSource();
    const copy = await duplicateEvent(db, "host-1", id, { now: new Date("2026-06-01T00:00:00Z") });

    expect(copy.id).not.toBe(id);
    const event = await getHostEvent(db, "host-1", copy.id);
    expect(event).toMatchObject({
      hostId: "host-1",
      hostName: "Will",
      title: "Fourth of July (again)",
      location: "Backyard",
      timezone: "America/Chicago",
      shareCode: copy.shareCode,
      maybePercent: 80,
      venmoUsername: "will-cooks",
      hostCoverCents: 1500,
      cancelledAt: null,
      deletedAt: null,
      detailsChangedAt: null,
      coverEmoji: null,
      coverColor: null,
    });
    expect(event.startsAt.toISOString()).toBe("2026-07-11T18:00:00.000Z");
    expect(copy.shareCode).not.toBe(shareCode);
  });

  it("does not stack ' (again)' when duplicating a copy", async () => {
    const { id } = await makeSource();
    const copy = await duplicateEvent(db, "host-1", id);
    const copyOfCopy = await duplicateEvent(db, "host-1", copy.id);
    const event = await getHostEvent(db, "host-1", copyOfCopy.id);
    expect(event.title).toBe("Fourth of July (again)");
  });

  it("gives the copy a fresh share code with the same shape as createEvent's", async () => {
    const { id } = await makeSource();
    const copy = await duplicateEvent(db, "host-1", id);
    expect(copy.shareCode).toMatch(/^[A-Za-z0-9_-]{8,}$/);
    const codes = await db.select({ shareCode: events.shareCode }).from(events);
    expect(new Set(codes.map((c) => c.shareCode)).size).toBe(codes.length);
  });

  it("retries with a new code when the generator collides", async () => {
    const { id } = await makeSource();
    // Take a code that another event already uses, then a fresh one.
    await db.update(events).set({ shareCode: "collision1" }).where(eq(events.id, id));
    const queue = ["collision1", "freshcode2"];
    const copy = await duplicateEvent(db, "host-1", id, {
      newShareCode: () => queue.shift() as string,
    });
    expect(copy.shareCode).toBe("freshcode2");
  });

  it("moves a future event one week later, same weekday and time", async () => {
    const { id } = await makeSource();
    const copy = await duplicateEvent(db, "host-1", id, {
      now: new Date("2026-06-01T09:30:00Z"),
    });
    const event = await getHostEvent(db, "host-1", copy.id);
    expect(event.startsAt.toISOString()).toBe("2026-07-11T18:00:00.000Z");
  });

  it("moves a past event to one week after now", async () => {
    const { id } = await makeSource();
    const now = new Date("2026-08-20T12:00:00Z");
    const copy = await duplicateEvent(db, "host-1", id, { now });
    const event = await getHostEvent(db, "host-1", copy.id);
    expect(event.startsAt.toISOString()).toBe("2026-08-27T12:00:00.000Z");
  });

  it("keeps the same wall-clock time across a daylight-saving change", async () => {
    // 7pm on Oct 25 (CDT); DST ends on Nov 1, so next week is 7pm CST, not 6pm.
    const { id } = await createEvent(db, "host-1", {
      ...input,
      startsAt: new Date("2026-10-26T00:00:00Z"),
    });
    const copy = await duplicateEvent(db, "host-1", id, {
      now: new Date("2026-10-01T00:00:00Z"),
    });
    const event = await getHostEvent(db, "host-1", copy.id);
    expect(event.startsAt.toISOString()).toBe("2026-11-02T01:00:00.000Z");
  });

  it("carries the menu and invitees, deduping the old guest list case-insensitively", async () => {
    const { id, shareCode } = await makeSource();
    await addDishToEvent(db, "host-1", id, "starter-burgers");
    await addInvitees(db, "host-1", id, ["Alex", "SAM"]);
    await submitRsvp(db, { shareCode, name: " alex ", status: "yes", plusOneNames: ["Jo"] });
    await submitRsvp(db, { shareCode, name: "Bea", status: "maybe", plusOneNames: [] });

    const copy = await duplicateEvent(db, "host-1", id, { now: new Date("2026-06-01T00:00:00Z") });

    const dishes = await db.select().from(eventDishes).where(eq(eventDishes.eventId, copy.id));
    expect(dishes).toHaveLength(1);
    expect(dishes[0].recipeId).toBe("starter-burgers");

    const copied = await db
      .select({ name: invitees.name })
      .from(invitees)
      .where(eq(invitees.eventId, copy.id));
    expect(copied.map((r) => r.name).sort()).toEqual(["Alex", "Bea", "SAM"]);
  });

  it("does not copy RSVPs, plus-ones, shopping state or extra costs", async () => {
    const { id, shareCode } = await makeSource();
    await addDishToEvent(db, "host-1", id, "starter-burgers");
    await submitRsvp(db, { shareCode, name: "Pat", status: "yes", plusOneNames: ["Sam"] });
    await setChecked(db, "host-1", id, "starter-burgers-beef", true);
    await db.insert(extraCosts).values({ eventId: id, label: "Ice", amountCents: 400 });

    const copy = await duplicateEvent(db, "host-1", id, { now: new Date("2026-06-01T00:00:00Z") });

    expect(await db.select().from(guests).where(eq(guests.eventId, copy.id))).toHaveLength(0);
    expect(await db.select().from(plusOnes)).toHaveLength(1); // only the source guest's
    expect(
      await db.select().from(shoppingState).where(eq(shoppingState.eventId, copy.id)),
    ).toHaveLength(0);
    expect(
      await db.select().from(extraCosts).where(eq(extraCosts.eventId, copy.id)),
    ).toHaveLength(0);
  });

  it("rejects another host's event and creates nothing", async () => {
    const { id } = await makeSource();
    await expect(duplicateEvent(db, "host-2", id)).rejects.toBeInstanceOf(NotFoundError);
    expect(await db.select().from(events)).toHaveLength(1);
  });

  it("rejects an unknown id and a deleted event", async () => {
    await expect(duplicateEvent(db, "host-1", "missing")).rejects.toBeInstanceOf(NotFoundError);

    const { id } = await makeSource();
    await db.update(events).set({ deletedAt: new Date() }).where(eq(events.id, id));
    await expect(duplicateEvent(db, "host-1", id)).rejects.toBeInstanceOf(NotFoundError);
    expect(await db.select().from(events)).toHaveLength(1);
  });
});
