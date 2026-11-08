// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Db } from "@/db/client";
import { createTestDb } from "@/db/test-db";
import { guestCookieName } from "@/lib/guest-cookie";
import { createEvent } from "@/services/events";
import { submitRsvp } from "@/services/rsvp";

const testDb = vi.hoisted(() => ({ db: null as unknown }));
const cookieSet = vi.hoisted(() => vi.fn());

vi.mock("@/db/client", () => ({ getDb: async () => testDb.db }));
vi.mock("next/headers", () => ({ cookies: async () => ({ set: cookieSet }) }));
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
  redirect: (url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  },
}));

import { submitGuestRsvp, updateGuestRsvp } from "./actions";

let db: Db;
let shareCode: string;

beforeEach(async () => {
  cookieSet.mockReset();
  db = await createTestDb();
  testDb.db = db;
  ({ shareCode } = await createEvent(db, "host-1", {
    title: "Cookout",
    startsAt: new Date("2026-07-04T18:00:00Z"),
    location: "Backyard",
    hostName: "Will",
  }));
});

function form(entries: [string, string][]) {
  const fd = new FormData();
  for (const [k, v] of entries) fd.append(k, v);
  return fd;
}

describe("guest RSVP actions", () => {
  it("submit sets the guest cookie and redirects to the edit page", async () => {
    await expect(
      submitGuestRsvp(shareCode, { error: null }, form([["name", "Ann"], ["status", "yes"]])),
    ).rejects.toThrow(/^NEXT_REDIRECT:\/e\/.+\/g\/.+/);
    expect(cookieSet).toHaveBeenCalledTimes(1);
    expect(cookieSet.mock.calls[0][0]).toBe(guestCookieName(shareCode));
  });

  it("update also (re)sets the cookie so a new device remembers the guest", async () => {
    const { editToken } = await submitRsvp(db, {
      shareCode,
      name: "Ann",
      status: "yes",
      plusOneNames: [],
    });
    await expect(
      updateGuestRsvp(shareCode, editToken, { error: null }, form([["name", "Ann"], ["status", "maybe"]])),
    ).rejects.toThrow(/^NEXT_REDIRECT:/);
    expect(cookieSet).toHaveBeenCalledTimes(1);
    const [name, value, options] = cookieSet.mock.calls[0];
    expect(name).toBe(guestCookieName(shareCode));
    expect(value).toBe(editToken);
    expect(options).toMatchObject({ httpOnly: true, sameSite: "lax", path: "/" });
  });

  it("update with a bad token sets no cookie", async () => {
    await expect(
      updateGuestRsvp(shareCode, "not-a-token", { error: null }, form([["name", "Ann"], ["status", "yes"]])),
    ).rejects.toThrow("NEXT_NOT_FOUND");
    expect(cookieSet).not.toHaveBeenCalled();
  });

  it("update with invalid input returns the error and sets no cookie", async () => {
    const { editToken } = await submitRsvp(db, {
      shareCode,
      name: "Ann",
      status: "yes",
      plusOneNames: [],
    });
    const result = await updateGuestRsvp(shareCode, editToken, { error: null }, form([["name", ""], ["status", "yes"]]));
    expect(result.error).toBeTruthy();
    expect(cookieSet).not.toHaveBeenCalled();
  });
});
