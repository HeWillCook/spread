// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Db } from "@/db/client";
import { guests } from "@/db/schema";
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

import { removeGuestAction } from "./actions";

const initial = { error: null };
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
    plusOneNames: ["Bo"],
  }));
});

function form(guest: string) {
  const fd = new FormData();
  fd.append("guestId", guest);
  return fd;
}

describe("removeGuestAction", () => {
  it("removes the guest named in the form", async () => {
    expect(await removeGuestAction(eventId, initial, form(guestId))).toEqual({ error: null });
    expect(await db.select().from(guests)).toEqual([]);
  });

  it("a different signed-in host gets a 404 and nothing is removed", async () => {
    session.hostId = "host-2";
    await expect(removeGuestAction(eventId, initial, form(guestId))).rejects.toThrow("NEXT_NOT_FOUND");
    expect(await db.select().from(guests)).toHaveLength(1);
  });

  it("a missing or bogus guest id is a 404", async () => {
    await expect(removeGuestAction(eventId, initial, form("nope"))).rejects.toThrow("NEXT_NOT_FOUND");
    await expect(removeGuestAction(eventId, initial, new FormData())).rejects.toThrow("NEXT_NOT_FOUND");
  });
});
