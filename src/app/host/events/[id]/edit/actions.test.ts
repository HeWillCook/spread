// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Db } from "@/db/client";
import { events } from "@/db/schema";
import { createTestDb } from "@/db/test-db";
import { eq } from "drizzle-orm";
import {
  cancelEvent,
  createEvent,
  findDeletedHostEvent,
  getHostEvent,
} from "@/services/events";

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

import {
  cancelEventAction,
  deleteEventAction,
  uncancelEventAction,
  updateEventAction,
} from "./actions";

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
  it("moves the event to the bin and redirects to the dashboard with its id", async () => {
    await expect(deleteEventAction(eventId)).rejects.toThrow(
      `NEXT_REDIRECT:/host?deleted=${encodeURIComponent(eventId)}`,
    );
    await expect(getHostEvent(db, "host-1", eventId)).rejects.toThrow();
    expect(await findDeletedHostEvent(db, "host-1", eventId)).toMatchObject({ title: "Cookout" });
  });

  it("a different signed-in host gets a 404 and the event stays", async () => {
    session.hostId = "host-2";
    await expect(deleteEventAction(eventId)).rejects.toThrow("NEXT_NOT_FOUND");
    expect((await getHostEvent(db, "host-1", eventId)).title).toBe("Cookout");
  });
});

describe("cancelEventAction", () => {
  it("cancels the event and returns to the edit page", async () => {
    await expect(cancelEventAction(eventId)).rejects.toThrow(
      `NEXT_REDIRECT:/host/events/${eventId}/edit`,
    );
    expect((await getHostEvent(db, "host-1", eventId)).cancelledAt).toBeInstanceOf(Date);
  });

  it("a different signed-in host gets a 404 and nothing changes", async () => {
    session.hostId = "host-2";
    await expect(cancelEventAction(eventId)).rejects.toThrow("NEXT_NOT_FOUND");
    expect((await getHostEvent(db, "host-1", eventId)).cancelledAt).toBeNull();
  });
});

describe("uncancelEventAction", () => {
  it("reinstates a cancelled event", async () => {
    await cancelEvent(db, "host-1", eventId);
    await expect(uncancelEventAction(eventId)).rejects.toThrow(
      `NEXT_REDIRECT:/host/events/${eventId}/edit`,
    );
    expect((await getHostEvent(db, "host-1", eventId)).cancelledAt).toBeNull();
  });

  it("a different signed-in host gets a 404", async () => {
    await cancelEvent(db, "host-1", eventId);
    session.hostId = "host-2";
    await expect(uncancelEventAction(eventId)).rejects.toThrow("NEXT_NOT_FOUND");
    expect((await getHostEvent(db, "host-1", eventId)).cancelledAt).toBeInstanceOf(Date);
  });

  it("cannot touch a deleted event", async () => {
    await db.update(events).set({ deletedAt: new Date() }).where(eq(events.id, eventId));
    await expect(uncancelEventAction(eventId)).rejects.toThrow("NEXT_NOT_FOUND");
  });
});
