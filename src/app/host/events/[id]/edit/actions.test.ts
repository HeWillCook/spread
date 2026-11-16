// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Db } from "@/db/client";
import { createTestDb } from "@/db/test-db";
import { createEvent, getHostEvent } from "@/services/events";

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

import { deleteEventAction, updateEventAction } from "./actions";

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

function form(over: Record<string, string> = {}) {
  const fd = new FormData();
  const values = {
    title: "Burger Night",
    startsAt: "2026-11-14T19:00",
    location: "The patio",
    timezone: "America/Chicago",
    ...over,
  };
  for (const [k, v] of Object.entries(values)) fd.append(k, v);
  return fd;
}

describe("updateEventAction", () => {
  it("saves and redirects back to the Guests tab", async () => {
    await expect(updateEventAction(eventId, { error: null }, form())).rejects.toThrow(
      `NEXT_REDIRECT:/host/events/${eventId}`,
    );
    expect(await getHostEvent(db, "host-1", eventId)).toMatchObject({
      title: "Burger Night",
      location: "The patio",
    });
  });

  it("returns a friendly error for bad input and saves nothing", async () => {
    expect(await updateEventAction(eventId, { error: null }, form({ location: " " }))).toEqual({
      error: "Where is it?",
    });
    expect((await getHostEvent(db, "host-1", eventId)).title).toBe("Cookout");
  });

  it("a different signed-in host gets a 404", async () => {
    session.hostId = "host-2";
    await expect(updateEventAction(eventId, { error: null }, form())).rejects.toThrow("NEXT_NOT_FOUND");
    expect((await getHostEvent(db, "host-1", eventId)).title).toBe("Cookout");
  });
});

describe("deleteEventAction", () => {
  it("deletes the event and redirects to the dashboard with its title", async () => {
    await expect(deleteEventAction(eventId)).rejects.toThrow(
      `NEXT_REDIRECT:/host?deleted=${encodeURIComponent("Cookout")}`,
    );
    await expect(getHostEvent(db, "host-1", eventId)).rejects.toThrow();
  });

  it("a different signed-in host gets a 404 and the event stays", async () => {
    session.hostId = "host-2";
    await expect(deleteEventAction(eventId)).rejects.toThrow("NEXT_NOT_FOUND");
    expect((await getHostEvent(db, "host-1", eventId)).title).toBe("Cookout");
  });
});
