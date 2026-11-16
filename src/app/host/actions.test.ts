// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Db } from "@/db/client";
import { createTestDb } from "@/db/test-db";
import { createEvent, deleteEvent, getHostEvent } from "@/services/events";

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
  redirect: (url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  },
}));

import { restoreEventAction } from "./actions";

let db: Db;
let eventId: string;

beforeEach(async () => {
  session.hostId = "host-1";
  db = await createTestDb();
  testDb.db = db;
  ({ id: eventId } = await createEvent(db, "host-1", {
    title: "Cookout",
    startsAt: new Date("2026-07-04T18:00:00Z"),
    location: "Backyard",
    hostName: "Will",
  }));
});

describe("restoreEventAction", () => {
  it("restores the host's deleted event and opens it", async () => {
    await deleteEvent(db, "host-1", eventId);

    await expect(restoreEventAction(eventId)).rejects.toThrow(
      `NEXT_REDIRECT:/host/events/${eventId}`,
    );

    const event = await getHostEvent(db, "host-1", eventId);
    expect(event.deletedAt).toBeNull();
    expect(event.title).toBe("Cookout");
  });

  it("a different signed-in host gets a 404 and the event stays deleted", async () => {
    await deleteEvent(db, "host-1", eventId);
    session.hostId = "host-2";

    await expect(restoreEventAction(eventId)).rejects.toThrow("NEXT_NOT_FOUND");
    await expect(getHostEvent(db, "host-1", eventId)).rejects.toThrow();
  });

  it("is a 404 for a live event or an unknown id", async () => {
    await expect(restoreEventAction(eventId)).rejects.toThrow("NEXT_NOT_FOUND");
    await expect(restoreEventAction("missing")).rejects.toThrow("NEXT_NOT_FOUND");
  });
});
