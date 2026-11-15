// @vitest-environment node
import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import type { Db } from "@/db/client";
import { guests } from "@/db/schema";
import { seedStarterRecipes } from "@/db/seed";
import { createTestDb } from "@/db/test-db";
import { ValidationError } from "./errors";
import { createEvent } from "./events";
import { getGuestsOverview } from "./guestsOverview";
import {
  addDevCrowd,
  addDevGuest,
  addDevSampleSet,
  clearDevGuests,
  listDevGuestLinks,
} from "./devGuests";

let db: Db;
let eventId: string;
let shareCode: string;

beforeEach(async () => {
  db = await createTestDb();
  await seedStarterRecipes(db);
  ({ id: eventId, shareCode } = await createEvent(db, "host-1", {
    title: "Cookout",
    startsAt: new Date("2026-12-05T18:00:00Z"),
    location: "Backyard",
    hostName: "Will",
  }));
});

describe("addDevGuest", () => {
  it("writes a real RSVP with plus-ones, notes and split flags", async () => {
    const { guestId, editToken } = await addDevGuest(db, "host-1", eventId, {
      name: "  Debug Guest  ",
      status: "yes",
      plusOneNames: ["Sam", "Riley"],
      foodNotes: "No dairy",
      attended: true,
      paid: true,
      excluded: false,
    });

    const [row] = await db.select().from(guests).where(eq(guests.id, guestId));
    expect(row).toMatchObject({
      name: "Debug Guest",
      status: "yes",
      foodNotes: "No dairy",
      attended: true,
      paid: true,
      excluded: false,
    });
    expect(editToken.length).toBeGreaterThan(20);

    const overview = await getGuestsOverview(db, "host-1", eventId);
    expect(overview.counts).toEqual({ yes: 1, maybe: 0, no: 0 });
    expect(overview.guests[0].plusOneNames).toEqual(["Sam", "Riley"]);
    expect(overview.headcount.confirmed).toBe(3);
  });

  it("ignores attended on a no, and drops blank plus-one names", async () => {
    const { guestId } = await addDevGuest(db, "host-1", eventId, {
      name: "Nay Sayer",
      status: "no",
      plusOneNames: ["", "  "],
      attended: true,
    });
    const [row] = await db.select().from(guests).where(eq(guests.id, guestId));
    expect(row.attended).toBe(false);
    const overview = await getGuestsOverview(db, "host-1", eventId);
    expect(overview.guests[0].plusOneNames).toEqual([]);
  });

  it("rejects an empty name and too many plus-ones", async () => {
    await expect(
      addDevGuest(db, "host-1", eventId, { name: "   ", status: "yes" }),
    ).rejects.toBeInstanceOf(ValidationError);
    await expect(
      addDevGuest(db, "host-1", eventId, {
        name: "Crowd",
        status: "yes",
        plusOneNames: Array.from({ length: 11 }, (_, i) => `Guest ${i}`),
      }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("denies another host's event", async () => {
    await expect(
      addDevGuest(db, "host-2", eventId, { name: "Sneaky", status: "yes" }),
    ).rejects.toBeInstanceOf(Error);
  });
});

describe("presets and cleanup", () => {
  it("adds one of each answer with plus-ones and notes", async () => {
    await addDevSampleSet(db, "host-1", eventId);
    const overview = await getGuestsOverview(db, "host-1", eventId);
    expect(overview.counts).toEqual({ yes: 1, maybe: 1, no: 1 });
    expect(overview.guests.find((g) => g.name === "Alex Chen")?.foodNotes).toContain("Peanut");
    expect(overview.headcount.confirmed).toBe(2); // Alex + Sam (Jordan is only a maybe)
    expect(overview.headcount.planFor).toBe(3); // 2 confirmed + half of 2 maybe heads
  });

  it("adds a deterministic 60/20/20 crowd", async () => {
    await addDevCrowd(db, "host-1", eventId, 10);
    const overview = await getGuestsOverview(db, "host-1", eventId);
    expect(overview.counts).toEqual({ yes: 6, maybe: 2, no: 2 });
    expect(overview.guests.length).toBe(10);
  });

  it("rejects a silly crowd size", async () => {
    await expect(addDevCrowd(db, "host-1", eventId, 0)).rejects.toBeInstanceOf(ValidationError);
    await expect(addDevCrowd(db, "host-1", eventId, 41)).rejects.toBeInstanceOf(ValidationError);
  });

  it("clears only this event's guests", async () => {
    await addDevSampleSet(db, "host-1", eventId);
    const other = await createEvent(db, "host-1", {
      title: "Other",
      startsAt: new Date("2026-12-06T18:00:00Z"),
      location: "Park",
      hostName: "Will",
    });
    await addDevGuest(db, "host-1", other.id, { name: "Other Guest", status: "yes" });

    const { removed } = await clearDevGuests(db, "host-1", eventId);
    expect(removed).toBe(3);
    expect(await db.select().from(guests).where(eq(guests.eventId, eventId))).toHaveLength(0);
    expect(await db.select().from(guests).where(eq(guests.eventId, other.id))).toHaveLength(1);
  });

  it("lists personal links for every guest", async () => {
    await addDevSampleSet(db, "host-1", eventId);
    const links = await listDevGuestLinks(db, "host-1", eventId, shareCode, "http://localhost:3000");
    expect(links).toHaveLength(3);
    for (const link of links) {
      expect(link.url).toContain(`/e/${shareCode}/g/`);
    }
  });
});
