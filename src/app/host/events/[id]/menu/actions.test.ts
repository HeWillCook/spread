// @vitest-environment node
import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Db } from "@/db/client";
import { eventDishes, recipeItems, recipes } from "@/db/schema";
import { seedStarterRecipes } from "@/db/seed";
import { createTestDb } from "@/db/test-db";
import { createEvent } from "@/services/events";
import { addDishToEvent } from "@/services/menu";

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
  addDishAction,
  createDishAction,
  removeDishAction,
  updateDishAction,
} from "./actions";

const initial = { error: null, saves: 0 };
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
});

function form(entries: [string, string][]) {
  const fd = new FormData();
  for (const [k, v] of entries) fd.append(k, v);
  return fd;
}

describe("menu actions", () => {
  it("addDishAction adds the dish, and reports a duplicate as a friendly error", async () => {
    const fd = form([["recipeId", "starter-burgers"]]);
    expect(await addDishAction(eventId, initial, fd)).toEqual({ error: null, saves: 1 });
    expect(await addDishAction(eventId, initial, fd)).toEqual({
      error: "Burgers is already on the menu",
      saves: 0,
    });
    expect(await db.select().from(eventDishes)).toHaveLength(1);
  });

  it("updateDishAction keeps an untouched rounded amount exact and saves edited ones", async () => {
    const { dishId } = await addDishToEvent(db, "host-1", eventId, "starter-burgers");
    // Beef untouched ("0.3333" is how 1/3 is shown), buns edited, servings edited.
    const result = await updateDishAction(
      eventId,
      dishId,
      initial,
      form([
        ["servings", "2"],
        ["amount:starter-burgers-beef", "0.3333"],
        ["amount:starter-burgers-buns", "2"],
      ]),
    );
    expect(result).toEqual({ error: null, saves: 1 });
    const [dish] = await db.select().from(eventDishes);
    expect(dish.servingsPerPerson).toBe(2);
    const items = await db.select().from(recipeItems).where(eq(recipeItems.recipeId, dish.recipeId));
    expect(items.find((i) => i.name === "Ground beef")?.perServing).toBe(1 / 3);
    expect(items.find((i) => i.name === "Burger buns")?.perServing).toBe(2);
  });

  it("updateDishAction turns bad numbers into a friendly error and changes nothing", async () => {
    const { dishId } = await addDishToEvent(db, "host-1", eventId, "starter-burgers");
    const result = await updateDishAction(
      eventId,
      dishId,
      initial,
      form([
        ["servings", "1.5"],
        ["amount:starter-burgers-beef", ""],
      ]),
    );
    expect(result.error).toMatch(/greater than 0/);
    expect((await db.select().from(recipes)).length).toBe(1);
  });

  it("a different signed-in host gets a 404, not the event's data", async () => {
    const { dishId } = await addDishToEvent(db, "host-1", eventId, "starter-burgers");
    session.hostId = "host-2";
    await expect(
      updateDishAction(eventId, dishId, initial, form([["servings", "2"]])),
    ).rejects.toThrow("NEXT_NOT_FOUND");
    await expect(removeDishAction(eventId, dishId, initial)).rejects.toThrow("NEXT_NOT_FOUND");
    await expect(
      addDishAction(eventId, initial, form([["recipeId", "starter-burgers"]])),
    ).rejects.toThrow("NEXT_NOT_FOUND");
    expect(await db.select().from(eventDishes)).toHaveLength(1);
  });

  it("removeDishAction removes the dish", async () => {
    const { dishId } = await addDishToEvent(db, "host-1", eventId, "starter-burgers");
    expect(await removeDishAction(eventId, dishId, initial)).toEqual({ error: null, saves: 1 });
    expect(await db.select().from(eventDishes)).toHaveLength(0);
  });

  it("createDishAction creates the recipe (price in dollars) and puts it on the menu", async () => {
    const result = await createDishAction(
      eventId,
      initial,
      form([
        ["name", "Coleslaw"],
        ["emoji", "🥗"],
        ["servings", "0.5"],
        ["itemName", "Cabbage"],
        ["itemEmoji", "🥬"],
        ["itemPerServing", "0.25"],
        ["itemUnit", "head"],
        ["itemBuyUnit", "head"],
        ["itemUnitsPerBuy", "1"],
        ["itemPrice", "3.50"],
      ]),
    );
    expect(result).toEqual({ error: null, saves: 1 });
    const [dish] = await db.select().from(eventDishes);
    expect(dish.servingsPerPerson).toBe(0.5);
    const [item] = await db.select().from(recipeItems).where(eq(recipeItems.recipeId, dish.recipeId));
    expect(item).toMatchObject({ name: "Cabbage", priceCents: 350, perServing: 0.25 });
  });

  it("createDishAction rejects a bad price with a friendly error and creates nothing", async () => {
    const result = await createDishAction(
      eventId,
      initial,
      form([
        ["name", "Coleslaw"],
        ["emoji", "🥗"],
        ["servings", "1"],
        ["itemName", "Cabbage"],
        ["itemEmoji", "🥬"],
        ["itemPerServing", "1"],
        ["itemUnit", "head"],
        ["itemBuyUnit", "head"],
        ["itemUnitsPerBuy", "1"],
        ["itemPrice", "three"],
      ]),
    );
    expect(result.error).toBe('Price for "Cabbage" should look like 3.50');
    expect(await db.select().from(recipes)).toHaveLength(1);
  });
});
