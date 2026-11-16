// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Db } from "@/db/client";
import { eventDishes, events, guests, invitees, plusOnes } from "@/db/schema";
import { seedStarterRecipes } from "@/db/seed";
import { createTestDb } from "@/db/test-db";
import { formatWhen } from "@/lib/format";
import { zonedLocalToDate } from "@/lib/zoned-time";
import { NotFoundError, ValidationError } from "./errors";
import {
  addInvitees,
  createEvent,
  deleteEvent,
  getHostEvent,
  headcountForEvents,
  listHostEvents,
  noReplyNames,
  updateEvent,
} from "./events";
import { addDishToEvent } from "./menu";
import { getPublicEvent, submitRsvp } from "./rsvp";

let db: Db;

beforeEach(async () => {
  db = await createTestDb();
});

const input = {
  title: "Fourth of July",
  startsAt: new Date("2026-07-04T18:00:00Z"),
  location: "Backyard",
  hostName: "Will",
};

describe("createEvent", () => {
  it("stores the event for the host and returns id + share code", async () => {
    const { id, shareCode } = await createEvent(db, "host-1", input);
    const event = await getHostEvent(db, "host-1", id);
    expect(event).toMatchObject({
      id,
      shareCode,
      hostId: "host-1",
      hostName: "Will",
      title: "Fourth of July",
      location: "Backyard",
      maybePercent: 50,
    });
    expect(event.startsAt).toEqual(input.startsAt);
  });

  it("gives every event a different, URL-safe share code of 8+ characters", async () => {
    const codes = new Set<string>();
    for (let i = 0; i < 20; i++) {
      const { shareCode } = await createEvent(db, "host-1", input);
      expect(shareCode).toMatch(/^[A-Za-z0-9_-]{8,}$/);
      codes.add(shareCode);
    }
    expect(codes.size).toBe(20);
  });

  it("retries with a fresh code when the share code collides", async () => {
    const queue = ["samecode1", "samecode1", "samecode1", "freshcode2"];
    const next = () => queue.shift() as string;
    const a = await createEvent(db, "host-1", input, next);
    const b = await createEvent(db, "host-1", input, next);
    expect(a.shareCode).toBe("samecode1");
    expect(b.shareCode).toBe("freshcode2");
  });

  it("trims text and rejects a blank title or location", async () => {
    const { id } = await createEvent(db, "host-1", {
      ...input,
      title: "  Cookout  ",
      location: "  Park ",
    });
    expect(await getHostEvent(db, "host-1", id)).toMatchObject({ title: "Cookout", location: "Park" });
    await expect(createEvent(db, "host-1", { ...input, title: "   " })).rejects.toBeInstanceOf(
      ValidationError,
    );
    await expect(createEvent(db, "host-1", { ...input, location: "" })).rejects.toBeInstanceOf(
      ValidationError,
    );
  });

  it("rejects an invalid date or time zone", async () => {
    await expect(
      createEvent(db, "host-1", { ...input, startsAt: new Date("nope") }),
    ).rejects.toBeInstanceOf(ValidationError);
    await expect(
      createEvent(db, "host-1", { ...input, timezone: "Mars/Olympus" }),
    ).rejects.toBeInstanceOf(ValidationError);
  });
});

describe("listHostEvents", () => {
  it("returns only that host's events, soonest first, with a headcount", async () => {
    const later = await createEvent(db, "host-1", {
      ...input,
      title: "Later",
      startsAt: new Date("2026-08-01T18:00:00Z"),
    });
    const sooner = await createEvent(db, "host-1", { ...input, title: "Sooner" });
    await createEvent(db, "host-2", { ...input, title: "Not mine" });

    await submitRsvp(db, {
      shareCode: sooner.shareCode,
      name: "Alex",
      status: "yes",
      plusOneNames: ["Sam"],
    });
    await submitRsvp(db, { shareCode: sooner.shareCode, name: "Bea", status: "maybe", plusOneNames: [] });

    const list = await listHostEvents(db, "host-1");
    expect(list.map((e) => e.title)).toEqual(["Sooner", "Later"]);
    expect(list[0]).toMatchObject({ id: sooner.id, shareCode: sooner.shareCode, planFor: 3 });
    expect(list[1]).toMatchObject({ id: later.id, planFor: 0 });
  });

  it("returns an empty list for a host with no events", async () => {
    expect(await listHostEvents(db, "nobody")).toEqual([]);
  });
});

describe("headcountForEvents", () => {
  it("uses each event's maybe percent", async () => {
    const { id, shareCode } = await createEvent(db, "host-1", input);
    await submitRsvp(db, { shareCode, name: "A", status: "yes", plusOneNames: [] });
    await submitRsvp(db, { shareCode, name: "B", status: "maybe", plusOneNames: ["C"] });
    // 1 confirmed + 2 maybe heads at 50% = 2
    expect((await headcountForEvents(db, [id])).get(id)?.planFor).toBe(2);
  });
});

describe("getHostEvent", () => {
  it("throws NotFoundError for another host's event", async () => {
    const { id } = await createEvent(db, "host-1", input);
    await expect(getHostEvent(db, "host-2", id)).rejects.toBeInstanceOf(NotFoundError);
  });

  it("throws NotFoundError for an unknown id", async () => {
    await expect(getHostEvent(db, "host-1", "missing")).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe("invitees", () => {
  it("drops blank names and trims the rest", async () => {
    const { id } = await createEvent(db, "host-1", input);
    await addInvitees(db, "host-1", id, [" Alex ", "", "   ", "Sam"]);
    expect((await noReplyNames(db, "host-1", id)).sort()).toEqual(["Alex", "Sam"]);
  });

  it("does not add the same name twice", async () => {
    const { id } = await createEvent(db, "host-1", input);
    await addInvitees(db, "host-1", id, ["Alex", "alex "]);
    await addInvitees(db, "host-1", id, ["ALEX"]);
    expect(await noReplyNames(db, "host-1", id)).toEqual(["Alex"]);
  });

  it("excludes an invitee once a guest with the same trimmed, case-insensitive name RSVPs", async () => {
    const { id, shareCode } = await createEvent(db, "host-1", input);
    await addInvitees(db, "host-1", id, ["Alex", "Sam"]);
    expect((await noReplyNames(db, "host-1", id)).sort()).toEqual(["Alex", "Sam"]);

    await submitRsvp(db, { shareCode, name: " alex ", status: "no", plusOneNames: [] });
    expect(await noReplyNames(db, "host-1", id)).toEqual(["Sam"]);
  });

  it("refuses to touch another host's event", async () => {
    const { id } = await createEvent(db, "host-1", input);
    await expect(addInvitees(db, "host-2", id, ["Alex"])).rejects.toBeInstanceOf(NotFoundError);
    await expect(noReplyNames(db, "host-2", id)).rejects.toBeInstanceOf(NotFoundError);
    expect(await noReplyNames(db, "host-1", id)).toEqual([]);
  });
});

describe("updateEvent", () => {
  const edit = {
    title: "Burger Night",
    startsAt: "2026-11-14T19:00",
    location: "The patio",
    timezone: "America/Chicago",
  };

  it("changes the details, reads the time in the given zone, and keeps the share code and RSVPs", async () => {
    const { id, shareCode } = await createEvent(db, "host-1", input);
    await submitRsvp(db, { shareCode, name: "Pat", status: "yes", plusOneNames: ["Sam"] });

    await updateEvent(db, "host-1", id, edit);

    const event = await getHostEvent(db, "host-1", id);
    expect(event).toMatchObject({
      title: "Burger Night",
      location: "The patio",
      timezone: "America/Chicago",
      shareCode,
      hostName: "Will",
    });
    expect(event.startsAt.toISOString()).toBe("2026-11-15T01:00:00.000Z");
    expect((await headcountForEvents(db, [id])).get(id)?.confirmed).toBe(2);
    expect((await getPublicEvent(db, shareCode)).title).toBe("Burger Night");
  });

  it("trims the title and location", async () => {
    const { id } = await createEvent(db, "host-1", input);
    await updateEvent(db, "host-1", id, { ...edit, title: "  Spaced  ", location: " Here " });
    expect(await getHostEvent(db, "host-1", id)).toMatchObject({ title: "Spaced", location: "Here" });
  });

  it("keeps the event's own time zone when none is given", async () => {
    const { id } = await createEvent(db, "host-1", { ...input, timezone: "Asia/Kolkata" });
    await updateEvent(db, "host-1", id, { title: "T", startsAt: "2026-11-14T19:00", location: "L" });
    const event = await getHostEvent(db, "host-1", id);
    expect(event.timezone).toBe("Asia/Kolkata");
    expect(event.startsAt.toISOString()).toBe("2026-11-14T13:30:00.000Z");
  });

  it("is a NotFoundError for another host and changes nothing", async () => {
    const { id } = await createEvent(db, "host-1", input);
    await expect(updateEvent(db, "host-2", id, edit)).rejects.toBeInstanceOf(NotFoundError);
    expect((await getHostEvent(db, "host-1", id)).title).toBe("Fourth of July");
  });

  it("rejects a bad time zone, date, title or location with a ValidationError and changes nothing", async () => {
    const { id } = await createEvent(db, "host-1", input);
    for (const bad of [
      { ...edit, timezone: "Mars/Olympus" },
      { ...edit, startsAt: "someday" },
      { ...edit, startsAt: "2026-02-31T10:00" },
      { ...edit, title: "   " },
      { ...edit, title: "x".repeat(101) },
      { ...edit, location: "" },
      { ...edit, location: "y".repeat(201) },
    ]) {
      await expect(updateEvent(db, "host-1", id, bad)).rejects.toBeInstanceOf(ValidationError);
    }
    const event = await getHostEvent(db, "host-1", id);
    expect(event).toMatchObject({ title: "Fourth of July", location: "Backyard" });
  });
});

describe("deleteEvent", () => {
  it("deletes the host's event and cascades its guests, plus-ones, invitees and dishes", async () => {
    await seedStarterRecipes(db);
    const { id, shareCode } = await createEvent(db, "host-1", input);
    await submitRsvp(db, { shareCode, name: "Alex", status: "yes", plusOneNames: ["Sam", "Jo"] });
    await addInvitees(db, "host-1", id, ["Bea"]);
    await addDishToEvent(db, "host-1", id, "starter-burgers");
    await createEvent(db, "host-2", { ...input, title: "Not mine" });

    expect(await deleteEvent(db, "host-1", id)).toEqual({ title: "Fourth of July" });

    expect((await db.select().from(events)).map((e) => e.title)).toEqual(["Not mine"]);
    expect(await db.select().from(guests)).toHaveLength(0);
    expect(await db.select().from(plusOnes)).toHaveLength(0);
    expect(await db.select().from(invitees)).toHaveLength(0);
    expect(await db.select().from(eventDishes)).toHaveLength(0);
    await expect(getPublicEvent(db, shareCode)).rejects.toBeInstanceOf(NotFoundError);
  });

  it("is a NotFoundError for another host's event and leaves it in place", async () => {
    const { id } = await createEvent(db, "host-1", input);
    await expect(deleteEvent(db, "host-2", id)).rejects.toBeInstanceOf(NotFoundError);
    expect((await getHostEvent(db, "host-1", id)).title).toBe("Fourth of July");
  });

  it("is a NotFoundError for an unknown id", async () => {
    await expect(deleteEvent(db, "host-1", "missing")).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe("event time zone", () => {
  const originalTz = process.env.TZ;

  // Restore the process time zone so other tests are unaffected.
  afterEach(() => {
    if (originalTz === undefined) delete process.env.TZ;
    else process.env.TZ = originalTz;
  });

  it("a 7pm event created from a datetime-local string renders as 7pm for guests whatever the server TZ", async () => {
    const timezone = "America/Chicago";
    const startsAt = zonedLocalToDate("2026-11-14T19:00", timezone);
    expect(startsAt.toISOString()).toBe("2026-11-15T01:00:00.000Z");

    const { shareCode } = await createEvent(db, "host-1", { ...input, startsAt, timezone });
    const guestView = await getPublicEvent(db, shareCode);

    for (const serverTz of ["UTC", "Asia/Tokyo", "America/Los_Angeles", "Pacific/Auckland"]) {
      process.env.TZ = serverTz;
      expect(formatWhen(guestView.startsAt, guestView.location, guestView.timezone)).toBe(
        "Sat, Nov 14 · 7pm · Backyard",
      );
    }
  });
});
