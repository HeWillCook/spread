// @vitest-environment node
import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Db } from "@/db/client";
import { events } from "@/db/schema";
import { createTestDb } from "@/db/test-db";
import { createEvent } from "@/services/events";

const state = vi.hoisted(() => ({ db: null as unknown }));
vi.mock("@/db/client", () => ({ getDb: async () => state.db }));

import { GET } from "./route";

let db: Db;

beforeEach(async () => {
  db = await createTestDb();
  state.db = db;
});

const params = (code: string) => ({ params: Promise.resolve({ code }) });
const request = () =>
  new Request("https://spread.example/e/code/calendar.ics", {
    headers: { host: "spread.example", "x-forwarded-proto": "https" },
  });

async function makeEvent(title = "Fourth of July") {
  return createEvent(db, "host-1", {
    title,
    startsAt: new Date("2026-11-15T01:00:00Z"),
    location: "Backyard",
    hostName: "Will",
    timezone: "America/Chicago",
  });
}

describe("GET /e/[code]/calendar.ics", () => {
  it("returns a downloadable calendar file for the event", async () => {
    const { shareCode } = await makeEvent();
    const response = await GET(request(), params(shareCode));

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("text/calendar; charset=utf-8");
    expect(response.headers.get("content-disposition")).toBe(
      'attachment; filename="fourth-of-july.ics"',
    );
    const body = await response.text();
    expect(body).toContain("BEGIN:VEVENT");
    expect(body).toContain("DTSTART:20261115T010000Z");
    expect(body).toContain("URL:https://spread.example/e/" + shareCode);
    expect(body).not.toContain("STATUS:CANCELLED");
  });

  it("marks a cancelled event as cancelled", async () => {
    const { id, shareCode } = await makeEvent();
    await db.update(events).set({ cancelledAt: new Date() }).where(eq(events.id, id));

    const response = await GET(request(), params(shareCode));
    expect(response.status).toBe(200);
    expect(await response.text()).toContain("STATUS:CANCELLED");
  });

  it("returns 404 for an unknown share code", async () => {
    const response = await GET(request(), params("nosuchcode"));
    expect(response.status).toBe(404);
  });

  it("returns 404 for a deleted event", async () => {
    const { id, shareCode } = await makeEvent();
    await db.update(events).set({ deletedAt: new Date() }).where(eq(events.id, id));

    const response = await GET(request(), params(shareCode));
    expect(response.status).toBe(404);
  });
});
