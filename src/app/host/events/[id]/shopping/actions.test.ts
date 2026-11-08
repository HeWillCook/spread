// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Db } from "@/db/client";
import { extraCosts, shoppingState } from "@/db/schema";
import { seedStarterRecipes } from "@/db/seed";
import { createTestDb } from "@/db/test-db";
import { createEvent } from "@/services/events";
import { addDishToEvent } from "@/services/menu";
import { addExtraCost } from "@/services/shopping";

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
  addExtraCostAction,
  removeExtraCostAction,
  setActualCostAction,
  setCheckedAction,
} from "./actions";

const initial = { error: null, saves: 0 };
const BEEF = "starter-burgers-beef";
let db: Db;
let eventId: string;

beforeEach(async () => {
  session.hostId = "host-1";
  db = await createTestDb();
  testDb.db = db;
  await seedStarterRecipes(db);
  ({ id: eventId } = await createEvent(db, "host-1", {
    title: "Cookout",
    startsAt: new Date("2026-07-04T18:00:00Z"),
    location: "Backyard",
    hostName: "Will",
  }));
  await addDishToEvent(db, "host-1", eventId, "starter-burgers");
});

function form(entries: [string, string][]) {
  const fd = new FormData();
  for (const [k, v] of entries) fd.append(k, v);
  return fd;
}

describe("shopping actions", () => {
  it("setCheckedAction ticks (checkbox sent) and unticks (nothing sent)", async () => {
    expect(await setCheckedAction(eventId, BEEF, initial, form([["checked", "on"]]))).toEqual({
      error: null,
      saves: 1,
    });
    expect((await db.select().from(shoppingState))[0].checked).toBe(true);
    await setCheckedAction(eventId, BEEF, initial, form([]));
    expect((await db.select().from(shoppingState))[0].checked).toBe(false);
  });

  it("setActualCostAction parses dollars, and a blank box clears the price", async () => {
    await setActualCostAction(eventId, BEEF, initial, form([["price", "$48.25"]]));
    expect((await db.select().from(shoppingState))[0].actualCents).toBe(4825);
    await setActualCostAction(eventId, BEEF, initial, form([["price", "  "]]));
    expect((await db.select().from(shoppingState))[0].actualCents).toBeNull();
  });

  it("setActualCostAction reports junk and negatives as a friendly error and writes nothing", async () => {
    for (const bad of ["lots", "-3", "1.234"]) {
      expect(await setActualCostAction(eventId, BEEF, initial, form([["price", bad]]))).toEqual({
        error: "Price should look like 3.50",
        saves: 0,
      });
    }
    expect(
      (await setActualCostAction(eventId, BEEF, initial, form([["price", "99999999"]]))).error,
    ).toMatch(/between \$0.00 and/);
    expect(await db.select().from(shoppingState)).toHaveLength(0);
  });

  it("add and remove extras", async () => {
    expect(
      await addExtraCostAction(eventId, initial, form([["label", "Ice"], ["amount", "8"]])),
    ).toEqual({ error: null, saves: 1 });
    const [extra] = await db.select().from(extraCosts);
    expect(extra).toMatchObject({ label: "Ice", amountCents: 800 });
    expect(await removeExtraCostAction(eventId, extra.id, initial)).toEqual({ error: null, saves: 1 });
    expect(await db.select().from(extraCosts)).toHaveLength(0);
  });

  it("addExtraCostAction explains a bad amount or a blank name", async () => {
    expect(
      (await addExtraCostAction(eventId, initial, form([["label", "Ice"], ["amount", "eight"]]))).error,
    ).toBe("Amount should look like 8.00");
    expect(
      (await addExtraCostAction(eventId, initial, form([["label", "  "], ["amount", "8"]]))).error,
    ).toBe("Give the cost a name, like Ice");
    expect(await db.select().from(extraCosts)).toHaveLength(0);
  });

  it("a different signed-in host gets a 404 and nothing is written", async () => {
    await addExtraCost(db, "host-1", eventId, "Ice", 800);
    const [extra] = await db.select().from(extraCosts);
    session.hostId = "host-2";
    await expect(setCheckedAction(eventId, BEEF, initial, form([["checked", "on"]]))).rejects.toThrow(
      "NEXT_NOT_FOUND",
    );
    await expect(
      setActualCostAction(eventId, BEEF, initial, form([["price", "1"]])),
    ).rejects.toThrow("NEXT_NOT_FOUND");
    await expect(
      addExtraCostAction(eventId, initial, form([["label", "Hat"], ["amount", "1"]])),
    ).rejects.toThrow("NEXT_NOT_FOUND");
    await expect(removeExtraCostAction(eventId, extra.id, initial)).rejects.toThrow("NEXT_NOT_FOUND");
    expect(await db.select().from(shoppingState)).toHaveLength(0);
    expect(await db.select().from(extraCosts)).toHaveLength(1);
  });

  it("an ingredient that isn't on this event is a 404", async () => {
    await expect(
      setCheckedAction(eventId, "not-an-item", initial, form([["checked", "on"]])),
    ).rejects.toThrow("NEXT_NOT_FOUND");
  });
});
