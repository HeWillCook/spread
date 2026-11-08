// @vitest-environment node
import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Db } from "@/db/client";
import { events, guests } from "@/db/schema";
import { createTestDb } from "@/db/test-db";
import { createEvent } from "@/services/events";
import { submitRsvp } from "@/services/rsvp";

const session = vi.hoisted(() => ({ hostId: "host-1" }));
const testDb = vi.hoisted(() => ({ db: null as unknown }));

vi.mock("@/server/auth", () => ({
  requireHost: async () => ({ id: session.hostId, name: "Host", email: "h@example.com" }),
}));
vi.mock("@/db/client", () => ({ getDb: async () => testDb.db }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
}));

import {
  markLinkSentAction,
  setAttendedAction,
  setExcludedAction,
  setHostCoverAction,
  setPaidAction,
  setVenmoUsernameAction,
} from "./actions";

const initial = { error: null, saves: 0 };
let db: Db;
let eventId: string;
let guestId: string;

beforeEach(async () => {
  session.hostId = "host-1";
  db = await createTestDb();
  testDb.db = db;
  const created = await createEvent(db, "host-1", {
    title: "Cookout",
    startsAt: new Date("2026-07-04T18:00:00Z"),
    location: "Backyard",
    hostName: "Will",
  });
  eventId = created.id;
  ({ guestId } = await submitRsvp(db, {
    shareCode: created.shareCode,
    name: "Ann",
    status: "yes",
    plusOneNames: [],
  }));
});

function form(entries: [string, string][]) {
  const fd = new FormData();
  for (const [k, v] of entries) fd.append(k, v);
  return fd;
}

async function guest() {
  const [g] = await db.select().from(guests).where(eq(guests.id, guestId));
  return g;
}

async function event() {
  const [e] = await db.select().from(events).where(eq(events.id, eventId));
  return e;
}

describe("split actions", () => {
  it("tick boxes save when sent and clear when nothing is sent", async () => {
    expect(await setAttendedAction(eventId, guestId, initial, form([["attended", "on"]]))).toEqual({
      error: null,
      saves: 1,
    });
    await setExcludedAction(eventId, guestId, initial, form([["excluded", "on"]]));
    await setPaidAction(eventId, guestId, initial, form([["paid", "on"]]));
    expect(await guest()).toMatchObject({ attended: true, excluded: true, paid: true, status: "yes" });

    await setAttendedAction(eventId, guestId, initial, form([]));
    await setExcludedAction(eventId, guestId, initial, form([]));
    await setPaidAction(eventId, guestId, initial, form([]));
    expect(await guest()).toMatchObject({ attended: false, excluded: false, paid: false });
  });

  it("markLinkSentAction stamps the time", async () => {
    await markLinkSentAction(eventId, guestId, initial);
    expect((await guest()).linkSentAt).toBeInstanceOf(Date);
  });

  it("setHostCoverAction parses dollars; blank means nothing covered", async () => {
    await setHostCoverAction(eventId, initial, form([["cover", "$12.50"]]));
    expect((await event()).hostCoverCents).toBe(1250);
    await setHostCoverAction(eventId, initial, form([["cover", "  "]]));
    expect((await event()).hostCoverCents).toBe(0);
  });

  it("setHostCoverAction explains bad amounts and writes nothing", async () => {
    await setHostCoverAction(eventId, initial, form([["cover", "5"]]));
    for (const bad of ["lots", "-3", "1.234"]) {
      expect(await setHostCoverAction(eventId, initial, form([["cover", bad]]))).toEqual({
        error: "Amount should look like 10.00",
        saves: 0,
      });
    }
    expect((await setHostCoverAction(eventId, initial, form([["cover", "99999999"]]))).error).toMatch(
      /between \$0.00 and/,
    );
    expect((await event()).hostCoverCents).toBe(500);
  });

  it("setVenmoUsernameAction saves, strips the @, clears on blank, and explains bad names", async () => {
    await setVenmoUsernameAction(eventId, initial, form([["username", " @will-cook "]]));
    expect((await event()).venmoUsername).toBe("will-cook");
    expect(
      (await setVenmoUsernameAction(eventId, initial, form([["username", "no spaces"]]))).error,
    ).toMatch(/5 to 30/);
    expect((await event()).venmoUsername).toBe("will-cook");
    await setVenmoUsernameAction(eventId, initial, form([["username", ""]]));
    expect((await event()).venmoUsername).toBeNull();
  });

  it("a different signed-in host gets a 404 and nothing is written", async () => {
    session.hostId = "host-2";
    await expect(
      setAttendedAction(eventId, guestId, initial, form([["attended", "on"]])),
    ).rejects.toThrow("NEXT_NOT_FOUND");
    await expect(markLinkSentAction(eventId, guestId, initial)).rejects.toThrow("NEXT_NOT_FOUND");
    await expect(setHostCoverAction(eventId, initial, form([["cover", "5"]]))).rejects.toThrow(
      "NEXT_NOT_FOUND",
    );
    await expect(
      setVenmoUsernameAction(eventId, initial, form([["username", "willcook"]])),
    ).rejects.toThrow("NEXT_NOT_FOUND");
    expect(await guest()).toMatchObject({ attended: false, linkSentAt: null });
    expect(await event()).toMatchObject({ hostCoverCents: 0, venmoUsername: null });
  });

  it("a guest that isn't on this event is a 404", async () => {
    await expect(
      setPaidAction(eventId, "not-a-guest", initial, form([["paid", "on"]])),
    ).rejects.toThrow("NEXT_NOT_FOUND");
  });
});
