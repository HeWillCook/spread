// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import type { Db } from "@/db/client";
import { eventDishes, events, guests, invitees, plusOnes } from "@/db/schema";
import { seedStarterRecipes } from "@/db/seed";
import { createTestDb } from "@/db/test-db";
import { formatWhen } from "@/lib/format";
import { zonedLocalToDate } from "@/lib/zoned-time";
import { NotFoundError, ValidationError } from "./errors";
import {
  addInvitees,
  cancelEvent,
  createEvent,
  deleteEvent,
  findDeletedHostEvent,
  getHostEvent,
  glanceForEvents,
  headcountForEvents,
  listHostEvents,
  noReplyNames,
  PURGE_AFTER_DAYS,
  purgeDeletedEvents,
  restoreEvent,
  uncancelEvent,
  updateEvent,
} from "./events";
import { addDishToEvent } from "./menu";
import { getGuestsOverview } from "./guestsOverview";
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

describe("event covers", () => {
  it("stores a preset emoji and colour, and leaves the default when none is given", async () => {
    const { id } = await createEvent(db, "host-1", {
      ...input,
      coverEmoji: "🍕",
      coverColor: "pickle",
    });
    expect(await getHostEvent(db, "host-1", id)).toMatchObject({
      coverEmoji: "🍕",
      coverColor: "pickle",
    });

    const plain = await createEvent(db, "host-1", { ...input, title: "Plain" });
    expect(await getHostEvent(db, "host-1", plain.id)).toMatchObject({
      coverEmoji: null,
      coverColor: null,
    });
    const summary = (await listHostEvents(db, "host-1")).find((e) => e.id === plain.id);
    expect(summary).toMatchObject({ coverEmoji: null, coverColor: null });
  });

  it("rejects emoji and colours outside the presets", async () => {
    await expect(
      createEvent(db, "host-1", { ...input, coverEmoji: "🚀" }),
    ).rejects.toBeInstanceOf(ValidationError);
    await expect(
      createEvent(db, "host-1", { ...input, coverColor: "neon" }),
    ).rejects.toBeInstanceOf(ValidationError);

    const { id } = await createEvent(db, "host-1", input);
    await expect(
      updateEvent(db, "host-1", id, {
        title: "Cookout",
        startsAt: "2026-07-04T18:00",
        location: "Backyard",
        timezone: "UTC",
        coverEmoji: "🚀",
      }),
    ).rejects.toBeInstanceOf(ValidationError);
    expect((await getHostEvent(db, "host-1", id)).coverEmoji).toBeNull();
  });

  it("changes the cover without marking the details as changed, and leaves it alone when omitted", async () => {
    const { id } = await createEvent(db, "host-1", input);
    const edit = {
      title: "Fourth of July",
      startsAt: "2026-07-04T18:00",
      location: "Backyard",
      timezone: "UTC",
    };

    const changed = await updateEvent(db, "host-1", id, {
      ...edit,
      coverEmoji: "🌮",
      coverColor: "ketchup",
    });
    expect(changed.detailsChanged).toBe(false);
    const event = await getHostEvent(db, "host-1", id);
    expect(event).toMatchObject({ coverEmoji: "🌮", coverColor: "ketchup" });
    expect(event.detailsChangedAt).toBeNull();

    await updateEvent(db, "host-1", id, edit);
    expect(await getHostEvent(db, "host-1", id)).toMatchObject({
      coverEmoji: "🌮",
      coverColor: "ketchup",
    });
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
    expect(list[1]).toMatchObject({ id: later.id, planFor: 0, cancelledAt: null });
  });

  it("leaves a deleted event out of the list", async () => {
    const { id } = await createEvent(db, "host-1", input);
    await deleteEvent(db, "host-1", id);
    expect(await listHostEvents(db, "host-1")).toEqual([]);
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

describe("glanceForEvents", () => {
  it("counts answers and unreplied invitees per event", async () => {
    const a = await createEvent(db, "host-1", { ...input, title: "A" });
    const b = await createEvent(db, "host-1", {
      ...input,
      title: "B",
      startsAt: new Date("2026-08-01T18:00:00Z"),
    });
    await addInvitees(db, "host-1", a.id, ["Alex", "Sam", "Jo"]);
    await submitRsvp(db, { shareCode: a.shareCode, name: " alex ", status: "yes", plusOneNames: [] });
    await submitRsvp(db, { shareCode: a.shareCode, name: "Bea", status: "maybe", plusOneNames: [] });
    await submitRsvp(db, { shareCode: a.shareCode, name: "Cy", status: "no", plusOneNames: [] });
    await addInvitees(db, "host-1", b.id, ["Dee"]);
    await submitRsvp(db, { shareCode: b.shareCode, name: "Dee", status: "yes", plusOneNames: [] });

    const glance = await glanceForEvents(db, [a.id, b.id]);
    // Alex's reply matches the invitee case-insensitively; Sam and Jo are silent.
    expect(glance.get(a.id)).toEqual({ yes: 1, maybe: 1, no: 1, noReply: 2 });
    expect(glance.get(b.id)).toEqual({ yes: 1, maybe: 0, no: 0, noReply: 0 });
  });

  it("leaves deleted events and unknown ids out", async () => {
    const { id, shareCode } = await createEvent(db, "host-1", input);
    await submitRsvp(db, { shareCode, name: "Alex", status: "yes", plusOneNames: [] });
    await deleteEvent(db, "host-1", id);

    const glance = await glanceForEvents(db, [id, "missing"]);
    expect(glance.size).toBe(0);
    expect(await glanceForEvents(db, [])).toEqual(new Map());
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

describe("updateEvent details change alerts", () => {
  const unchanged = {
    title: "Fourth of July",
    startsAt: "2026-07-04T18:00",
    location: "Backyard",
    timezone: "UTC",
  };

  it("does not count a title-only edit", async () => {
    const { id } = await createEvent(db, "host-1", input);
    const result = await updateEvent(db, "host-1", id, { ...unchanged, title: "July Cookout" });
    expect(result).toEqual({ detailsChanged: false });
    const event = await getHostEvent(db, "host-1", id);
    expect(event.title).toBe("July Cookout");
    expect(event.detailsChangedAt).toBeNull();
  });

  it("stamps detailsChangedAt when the start time changes", async () => {
    const { id } = await createEvent(db, "host-1", input);
    const result = await updateEvent(db, "host-1", id, {
      ...unchanged,
      startsAt: "2026-07-04T19:00",
    });
    expect(result).toEqual({ detailsChanged: true });
    expect((await getHostEvent(db, "host-1", id)).detailsChangedAt).toBeInstanceOf(Date);
  });

  it("stamps detailsChangedAt when the time zone changes", async () => {
    const { id } = await createEvent(db, "host-1", input);
    const result = await updateEvent(db, "host-1", id, {
      ...unchanged,
      timezone: "America/Chicago",
    });
    expect(result).toEqual({ detailsChanged: true });
    expect((await getHostEvent(db, "host-1", id)).timezone).toBe("America/Chicago");
  });

  it("stamps detailsChangedAt when the location changes", async () => {
    const { id } = await createEvent(db, "host-1", input);
    const result = await updateEvent(db, "host-1", id, { ...unchanged, location: "The park" });
    expect(result).toEqual({ detailsChanged: true });
    expect((await getHostEvent(db, "host-1", id)).location).toBe("The park");
  });

  it("leaves an earlier stamp alone when saving the same details again", async () => {
    const { id } = await createEvent(db, "host-1", input);
    const stamp = new Date("2026-06-01T12:00:00Z");
    await updateEvent(db, "host-1", id, { ...unchanged, location: "The park" }, stamp);
    const result = await updateEvent(db, "host-1", id, { ...unchanged, location: "The park" });
    expect(result).toEqual({ detailsChanged: false });
    expect((await getHostEvent(db, "host-1", id)).detailsChangedAt).toEqual(stamp);
  });
});

describe("deleteEvent", () => {
  it("hides the host's event from every host read path but keeps its data", async () => {
    await seedStarterRecipes(db);
    const { id, shareCode } = await createEvent(db, "host-1", input);
    await submitRsvp(db, { shareCode, name: "Alex", status: "yes", plusOneNames: ["Sam", "Jo"] });
    await addInvitees(db, "host-1", id, ["Bea"]);
    await addDishToEvent(db, "host-1", id, "starter-burgers");
    await createEvent(db, "host-2", { ...input, title: "Not mine" });

    expect(await deleteEvent(db, "host-1", id)).toEqual({ title: "Fourth of July" });

    // The row is still there: a soft delete, so it can be restored.
    expect((await db.select().from(events)).map((e) => e.title).sort()).toEqual([
      "Fourth of July",
      "Not mine",
    ]);
    expect(await db.select().from(guests)).toHaveLength(1);
    expect(await db.select().from(plusOnes)).toHaveLength(2);
    expect(await db.select().from(invitees)).toHaveLength(1);
    expect(await db.select().from(eventDishes)).toHaveLength(1);

    // No host read path finds it any more.
    await expect(getHostEvent(db, "host-1", id)).rejects.toBeInstanceOf(NotFoundError);
    expect((await listHostEvents(db, "host-1")).map((e) => e.title)).toEqual([]);
    expect((await headcountForEvents(db, [id])).has(id)).toBe(false);
    await expect(getGuestsOverview(db, "host-1", id)).rejects.toBeInstanceOf(NotFoundError);

    // Host writes are rejected too, so nothing can change behind the Undo link.
    await expect(updateEvent(db, "host-1", id, {
      title: "Nope",
      startsAt: "2026-11-14T19:00",
      location: "Nowhere",
    })).rejects.toBeInstanceOf(NotFoundError);
    await expect(addInvitees(db, "host-1", id, ["Cy"])).rejects.toBeInstanceOf(NotFoundError);
    await expect(cancelEvent(db, "host-1", id)).rejects.toBeInstanceOf(NotFoundError);

    expect(await findDeletedHostEvent(db, "host-1", id)).toMatchObject({
      title: "Fourth of July",
    });
    // Another host can't see that it exists, deleted or not.
    expect(await findDeletedHostEvent(db, "host-2", id)).toBeNull();
  });

  it("is a NotFoundError for another host's event and leaves it in place", async () => {
    const { id } = await createEvent(db, "host-1", input);
    await expect(deleteEvent(db, "host-2", id)).rejects.toBeInstanceOf(NotFoundError);
    expect((await getHostEvent(db, "host-1", id)).title).toBe("Fourth of July");
  });

  it("is a NotFoundError for an unknown id", async () => {
    await expect(deleteEvent(db, "host-1", "missing")).rejects.toBeInstanceOf(NotFoundError);
  });

  it("is a NotFoundError the second time", async () => {
    const { id } = await createEvent(db, "host-1", input);
    await deleteEvent(db, "host-1", id);
    await expect(deleteEvent(db, "host-1", id)).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe("restoreEvent", () => {
  it("brings a deleted event and all its data back", async () => {
    await seedStarterRecipes(db);
    const { id, shareCode } = await createEvent(db, "host-1", input);
    await submitRsvp(db, { shareCode, name: "Alex", status: "yes", plusOneNames: ["Sam"] });
    await deleteEvent(db, "host-1", id);

    await restoreEvent(db, "host-1", id);

    const event = await getHostEvent(db, "host-1", id);
    expect(event.deletedAt).toBeNull();
    expect((await listHostEvents(db, "host-1")).map((e) => e.id)).toEqual([id]);
    expect((await headcountForEvents(db, [id])).get(id)?.confirmed).toBe(2);
    expect((await getGuestsOverview(db, "host-1", id)).guests.map((g) => g.name)).toEqual([
      "Alex",
    ]);
    expect((await getPublicEvent(db, shareCode)).deletedAt).toBeNull();
  });

  it("is a NotFoundError for a live event, another host's event or an unknown id", async () => {
    const { id } = await createEvent(db, "host-1", input);
    await expect(restoreEvent(db, "host-1", id)).rejects.toBeInstanceOf(NotFoundError);

    await deleteEvent(db, "host-1", id);
    await expect(restoreEvent(db, "host-2", id)).rejects.toBeInstanceOf(NotFoundError);
    await expect(restoreEvent(db, "host-1", "missing")).rejects.toBeInstanceOf(NotFoundError);
    await expect(getHostEvent(db, "host-2", id)).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe("purgeDeletedEvents", () => {
  const backdate = async (id: string, days: number) => {
    await db
      .update(events)
      .set({ deletedAt: new Date(Date.now() - days * 24 * 60 * 60 * 1000) })
      .where(eq(events.id, id));
  };

  it("hard-deletes only this host's events deleted more than 30 days ago", async () => {
    const { id: old } = await createEvent(db, "host-1", { ...input, title: "Old" });
    const { id: recent } = await createEvent(db, "host-1", { ...input, title: "Recent" });
    const { id: otherHosts } = await createEvent(db, "host-2", { ...input, title: "Theirs" });
    await deleteEvent(db, "host-1", old);
    await deleteEvent(db, "host-1", recent);
    await deleteEvent(db, "host-2", otherHosts);
    await backdate(old, PURGE_AFTER_DAYS + 1);
    await backdate(recent, PURGE_AFTER_DAYS - 1);
    await backdate(otherHosts, PURGE_AFTER_DAYS + 1);

    expect(await purgeDeletedEvents(db, "host-1")).toBe(1);

    expect((await db.select().from(events)).map((e) => e.title).sort()).toEqual([
      "Recent",
      "Theirs",
    ]);
    // Purged means gone, even from the Undo lookup.
    expect(await findDeletedHostEvent(db, "host-1", old)).toBeNull();
    expect(await findDeletedHostEvent(db, "host-2", otherHosts)).not.toBeNull();
  });

  it("purges a 30-day-old deleted event and cascades its children", async () => {
    await seedStarterRecipes(db);
    const { id, shareCode } = await createEvent(db, "host-1", input);
    await submitRsvp(db, { shareCode, name: "Alex", status: "yes", plusOneNames: ["Sam"] });
    await deleteEvent(db, "host-1", id);
    await backdate(id, PURGE_AFTER_DAYS + 1);

    expect(await purgeDeletedEvents(db, "host-1")).toBe(1);
    expect(await db.select().from(events)).toHaveLength(0);
    expect(await db.select().from(guests)).toHaveLength(0);
    expect(await db.select().from(plusOnes)).toHaveLength(0);
  });

  it("leaves live events alone", async () => {
    await createEvent(db, "host-1", input);
    expect(await purgeDeletedEvents(db, "host-1")).toBe(0);
    expect((await listHostEvents(db, "host-1"))).toHaveLength(1);
  });
});

describe("cancelEvent / uncancelEvent", () => {
  it("cancels without deleting: the event still lists and guests still see it", async () => {
    const { id, shareCode } = await createEvent(db, "host-1", input);
    await cancelEvent(db, "host-1", id);

    const event = await getHostEvent(db, "host-1", id);
    expect(event.cancelledAt).toBeInstanceOf(Date);
    expect((await listHostEvents(db, "host-1"))[0].cancelledAt).toBeInstanceOf(Date);
    const guestView = await getPublicEvent(db, shareCode);
    expect(guestView.cancelledAt).toBeInstanceOf(Date);
    expect(guestView.deletedAt).toBeNull();
  });

  it("uncancels and reopens RSVPs", async () => {
    const { id, shareCode } = await createEvent(db, "host-1", input);
    await cancelEvent(db, "host-1", id);
    await uncancelEvent(db, "host-1", id);

    expect((await getHostEvent(db, "host-1", id)).cancelledAt).toBeNull();
    expect((await getPublicEvent(db, shareCode)).cancelledAt).toBeNull();
    await expect(
      submitRsvp(db, { shareCode, name: "Alex", status: "yes", plusOneNames: [] }),
    ).resolves.toBeDefined();
  });

  it("is a NotFoundError for another host, an unknown id or a deleted event", async () => {
    const { id } = await createEvent(db, "host-1", input);
    await expect(cancelEvent(db, "host-2", id)).rejects.toBeInstanceOf(NotFoundError);
    await expect(uncancelEvent(db, "host-2", id)).rejects.toBeInstanceOf(NotFoundError);
    await expect(cancelEvent(db, "host-1", "missing")).rejects.toBeInstanceOf(NotFoundError);

    await cancelEvent(db, "host-1", id);
    await expect(uncancelEvent(db, "host-2", id)).rejects.toBeInstanceOf(NotFoundError);
    expect((await getHostEvent(db, "host-1", id)).cancelledAt).toBeInstanceOf(Date);

    await deleteEvent(db, "host-1", id);
    await expect(cancelEvent(db, "host-1", id)).rejects.toBeInstanceOf(NotFoundError);
    await expect(uncancelEvent(db, "host-1", id)).rejects.toBeInstanceOf(NotFoundError);
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
