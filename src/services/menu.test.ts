// @vitest-environment node
import { and, asc, eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import type { Db } from "@/db/client";
import { eventDishes, recipeItems, recipes, shoppingState } from "@/db/schema";
import { seedStarterRecipes } from "@/db/seed";
import { createTestDb } from "@/db/test-db";
import { STARTER_RECIPES, type RecipeItem } from "@/domain/recipes";
import { NotFoundError, ValidationError } from "./errors";
import { createEvent } from "./events";
import {
  addDishToEvent,
  createCustomRecipe,
  getMenu,
  listRecipesForHost,
  removeDish,
  updateDish,
} from "./menu";

const BURGERS = "starter-burgers";
const STARTER_BEEF = "starter-burgers-beef";
const LIBRARY = STARTER_RECIPES.length;

let db: Db;
let eventId: string;

beforeEach(async () => {
  db = await createTestDb();
  await seedStarterRecipes(db);
  ({ id: eventId } = await createEvent(db, "host-1", {
    title: "Cookout",
    startsAt: new Date("2026-07-04T18:00:00Z"),
    location: "Backyard",
    hostName: "Will",
  }));
});

type NewItem = Omit<RecipeItem, "id">;
const slaw: NewItem = {
  name: "Cabbage",
  emoji: "🥬",
  perServing: 0.25,
  unit: "head",
  buyUnit: "head",
  unitsPerBuy: 1,
  priceCents: 300,
};
const dressing: NewItem = {
  name: "Dressing",
  emoji: "🥣",
  perServing: 2,
  unit: "tbsp",
  buyUnit: "bottle",
  unitsPerBuy: 24,
  priceCents: 450,
};

async function customRecipe(hostId = "host-1", name = "Coleslaw") {
  return (
    await createCustomRecipe(db, hostId, {
      name,
      emoji: "🥗",
      defaultServingsPerPerson: 0.5,
      items: [slaw, dressing],
    })
  ).recipeId;
}

async function dishRow(dishId: string) {
  const [row] = await db.select().from(eventDishes).where(eq(eventDishes.id, dishId));
  return row;
}

async function itemsOf(recipeId: string) {
  return db
    .select()
    .from(recipeItems)
    .where(eq(recipeItems.recipeId, recipeId))
    .orderBy(asc(recipeItems.position));
}

const starterAmounts = (beef: number) => ({ [STARTER_BEEF]: beef });

describe("listRecipesForHost", () => {
  it("returns the starters plus this host's own recipes, never another host's", async () => {
    const mine = await customRecipe("host-1", "Mine");
    const theirs = await customRecipe("host-2", "Theirs");
    const list = await listRecipesForHost(db, "host-1");
    const ids = list.map((r) => r.id);
    expect(ids).toContain(BURGERS);
    expect(ids).toContain(mine);
    expect(ids).not.toContain(theirs);
    const burgers = list.find((r) => r.id === BURGERS);
    expect(burgers?.items.map((i) => i.id)).toEqual(STARTER_RECIPES[0].items.map((i) => i.id));
  });
});

describe("addDishToEvent", () => {
  it("adds the starter burgers with the recipe's default 1.5 servings per person", async () => {
    const { dishId } = await addDishToEvent(db, "host-1", eventId, BURGERS);
    expect(await dishRow(dishId)).toMatchObject({
      eventId,
      recipeId: BURGERS,
      servingsPerPerson: 1.5,
    });
  });

  it("adds the host's own recipe", async () => {
    const recipeId = await customRecipe();
    const { dishId } = await addDishToEvent(db, "host-1", eventId, recipeId);
    expect(await dishRow(dishId)).toMatchObject({ recipeId, servingsPerPerson: 0.5 });
  });

  it("rejects adding the same recipe to an event twice", async () => {
    await addDishToEvent(db, "host-1", eventId, BURGERS);
    await expect(addDishToEvent(db, "host-1", eventId, BURGERS)).rejects.toBeInstanceOf(
      ValidationError,
    );
    expect(await db.select().from(eventDishes)).toHaveLength(1);
  });

  it("two simultaneous adds of the same recipe leave exactly one dish", async () => {
    const results = await Promise.allSettled([
      addDishToEvent(db, "host-1", eventId, BURGERS),
      addDishToEvent(db, "host-1", eventId, BURGERS),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    const rejected = results.filter((r): r is PromiseRejectedResult => r.status === "rejected");
    expect(rejected).toHaveLength(1);
    expect(rejected[0].reason).toBeInstanceOf(ValidationError);
    expect(await db.select().from(eventDishes)).toHaveLength(1);
  });

  it("the database itself refuses a second row for the same event and recipe", async () => {
    await addDishToEvent(db, "host-1", eventId, BURGERS);
    await expect(
      db.insert(eventDishes).values({ eventId, recipeId: BURGERS, servingsPerPerson: 1 }),
    ).rejects.toThrow();
    expect(await db.select().from(eventDishes)).toHaveLength(1);
    // The same recipe on a different event is fine.
    const other = await createEvent(db, "host-1", {
      title: "Other",
      startsAt: new Date("2026-08-01T18:00:00Z"),
      location: "Park",
      hostName: "Will",
    });
    await expect(addDishToEvent(db, "host-1", other.id, BURGERS)).resolves.toBeDefined();
  });

  it("throws NotFoundError for another host's event", async () => {
    await expect(addDishToEvent(db, "host-2", eventId, BURGERS)).rejects.toBeInstanceOf(
      NotFoundError,
    );
    expect(await db.select().from(eventDishes)).toHaveLength(0);
  });

  it("throws NotFoundError for another host's recipe or an unknown recipe", async () => {
    const theirs = await customRecipe("host-2");
    await expect(addDishToEvent(db, "host-1", eventId, theirs)).rejects.toBeInstanceOf(
      NotFoundError,
    );
    await expect(addDishToEvent(db, "host-1", eventId, "nope")).rejects.toBeInstanceOf(
      NotFoundError,
    );
    expect(await db.select().from(eventDishes)).toHaveLength(0);
  });
});

describe("updateDish", () => {
  it("first edit of a starter clones it for the host and leaves the starter untouched", async () => {
    // Instructions live on the row, so set them the way the seed would before copying.
    await db
      .update(recipes)
      .set({
        description: "Smash-style patties",
        prepMinutes: 15,
        cookMinutes: 20,
        steps: ["Form the patties.", "Grill 4 minutes a side."],
        tips: ["Toast the buns."],
        equipment: ["Grill"],
      })
      .where(eq(recipes.id, BURGERS));
    const { dishId } = await addDishToEvent(db, "host-1", eventId, BURGERS);
    await updateDish(db, "host-1", eventId, dishId, {
      servingsPerPerson: 2,
      itemAmounts: starterAmounts(0.5),
    });

    const dish = await dishRow(dishId);
    expect(dish.recipeId).not.toBe(BURGERS);
    expect(dish.servingsPerPerson).toBe(2);

    const [copy] = await db.select().from(recipes).where(eq(recipes.id, dish.recipeId));
    expect(copy).toMatchObject({
      ownerId: "host-1",
      name: "Burgers",
      emoji: "🍔",
      // The how-to text and the starter it came from travel with the copy.
      description: "Smash-style patties",
      prepMinutes: 15,
      cookMinutes: 20,
      steps: ["Form the patties.", "Grill 4 minutes a side."],
      tips: ["Toast the buns."],
      equipment: ["Grill"],
      originRecipeId: BURGERS,
    });
    // The copy stays in its starter's picker section and keeps the "Starter recipe" pill.
    const menu = await getMenu(db, "host-1", eventId);
    expect(menu.dishes[0].recipe.category).toBe("Grill");
    expect(menu.dishes[0].isStarter).toBe(true);
    expect(menu.dishes[0].recipe.steps).toEqual([
      "Form the patties.",
      "Grill 4 minutes a side.",
    ]);
    // ...and the starter it came from never shows twice in the picker.
    expect(menu.available.map((r) => r.id)).not.toContain(BURGERS);
    const copyItems = await itemsOf(copy.id);
    expect(copyItems.map((i) => i.name)).toEqual(STARTER_RECIPES[0].items.map((i) => i.name));
    expect(copyItems[0].perServing).toBe(0.5);
    // Everything else is copied as-is.
    expect(copyItems[1]).toMatchObject({ name: "Burger buns", perServing: 1, unitsPerBuy: 8 });
    expect(copyItems.every((i) => !i.id.startsWith("starter-"))).toBe(true);

    const [starter] = await db.select().from(recipes).where(eq(recipes.id, BURGERS));
    expect(starter.ownerId).toBeNull();
    const starterItems = await itemsOf(BURGERS);
    expect(starterItems).toHaveLength(5);
    expect(starterItems[0].perServing).toBe(1 / 3);
  });

  it("a second edit updates the copy in place without cloning again", async () => {
    const { dishId } = await addDishToEvent(db, "host-1", eventId, BURGERS);
    await updateDish(db, "host-1", eventId, dishId, {
      servingsPerPerson: 2,
      itemAmounts: starterAmounts(0.5),
    });
    const { recipeId: copyId } = await dishRow(dishId);
    const copyBeef = (await itemsOf(copyId))[0];

    await updateDish(db, "host-1", eventId, dishId, {
      servingsPerPerson: 1,
      itemAmounts: { [copyBeef.id]: 0.25 },
    });

    expect((await dishRow(dishId)).recipeId).toBe(copyId);
    expect((await dishRow(dishId)).servingsPerPerson).toBe(1);
    expect((await itemsOf(copyId))[0].perServing).toBe(0.25);
    expect(await db.select().from(recipes)).toHaveLength(LIBRARY + 1); // library + one copy
  });

  it("re-keys shopping state from the starter items to the cloned items, preserving it", async () => {
    const { dishId } = await addDishToEvent(db, "host-1", eventId, BURGERS);
    await db
      .insert(shoppingState)
      .values({ eventId, recipeItemId: STARTER_BEEF, checked: true, checkedQty: 8, actualCents: 5400 });
    await db
      .insert(shoppingState)
      .values({ eventId, recipeItemId: "starter-burgers-buns", checked: false, actualCents: 700 });

    await updateDish(db, "host-1", eventId, dishId, {
      servingsPerPerson: 1.5,
      itemAmounts: starterAmounts(0.4),
    });

    const copyItems = await itemsOf((await dishRow(dishId)).recipeId);
    const rows = await db.select().from(shoppingState).where(eq(shoppingState.eventId, eventId));
    expect(rows).toHaveLength(2);
    expect(rows.some((r) => r.recipeItemId.startsWith("starter-"))).toBe(false);
    expect(rows.find((r) => r.recipeItemId === copyItems[0].id)).toMatchObject({
      checked: true,
      checkedQty: 8,
      actualCents: 5400,
    });
    expect(rows.find((r) => r.recipeItemId === copyItems[1].id)).toMatchObject({
      checked: false,
      actualCents: 700,
    });
  });

  it("leaves another event's shopping state on the starter items alone", async () => {
    const { id: otherEvent } = await createEvent(db, "host-1", {
      title: "Other",
      startsAt: new Date("2026-08-04T18:00:00Z"),
      location: "Park",
      hostName: "Will",
    });
    await addDishToEvent(db, "host-1", otherEvent, BURGERS);
    await db
      .insert(shoppingState)
      .values({ eventId: otherEvent, recipeItemId: STARTER_BEEF, checked: true, actualCents: 100 });
    const { dishId } = await addDishToEvent(db, "host-1", eventId, BURGERS);
    await updateDish(db, "host-1", eventId, dishId, {
      servingsPerPerson: 1.5,
      itemAmounts: starterAmounts(0.4),
    });
    const [row] = await db
      .select()
      .from(shoppingState)
      .where(and(eq(shoppingState.eventId, otherEvent)));
    expect(row.recipeItemId).toBe(STARTER_BEEF);
  });

  it("edits a host-owned custom recipe in place (no clone)", async () => {
    const recipeId = await customRecipe();
    const { dishId } = await addDishToEvent(db, "host-1", eventId, recipeId);
    const [cabbage] = await itemsOf(recipeId);
    await updateDish(db, "host-1", eventId, dishId, {
      servingsPerPerson: 1,
      itemAmounts: { [cabbage.id]: 0.5 },
    });
    expect((await dishRow(dishId)).recipeId).toBe(recipeId);
    expect((await itemsOf(recipeId))[0].perServing).toBe(0.5);
  });

  async function secondEvent() {
    return (
      await createEvent(db, "host-1", {
        title: "Second",
        startsAt: new Date("2026-08-04T18:00:00Z"),
        location: "Park",
        hostName: "Will",
      })
    ).id;
  }

  it("two simultaneous first edits of a starter dish make exactly one copy and keep the shopping state", async () => {
    const { dishId } = await addDishToEvent(db, "host-1", eventId, BURGERS);
    await db
      .insert(shoppingState)
      .values({ eventId, recipeItemId: STARTER_BEEF, checked: true, actualCents: 5400 });

    // Both forms were built from the starter's item ids. The loser of the lock sees the
    // dish already on the copy, so its stale item ids are rejected (friendly error in the UI).
    const results = await Promise.allSettled([
      updateDish(db, "host-1", eventId, dishId, {
        servingsPerPerson: 2,
        itemAmounts: starterAmounts(0.5),
      }),
      updateDish(db, "host-1", eventId, dishId, {
        servingsPerPerson: 3,
        itemAmounts: starterAmounts(0.6),
      }),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    for (const r of results) {
      if (r.status === "rejected") expect(r.reason).toBeInstanceOf(ValidationError);
    }

    const owned = await db.select().from(recipes).where(eq(recipes.ownerId, "host-1"));
    expect(owned).toHaveLength(1);
    const dish = await dishRow(dishId);
    expect(dish.recipeId).toBe(owned[0].id);
    const copyItems = await itemsOf(owned[0].id);
    const rows = await db.select().from(shoppingState).where(eq(shoppingState.eventId, eventId));
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      recipeItemId: copyItems[0].id,
      checked: true,
      actualCents: 5400,
    });
    // Whichever edit ran last won; no leftover copies, starter untouched.
    expect([2, 3]).toContain(dish.servingsPerPerson);
    expect(await db.select().from(recipes)).toHaveLength(LIBRARY + 1);
    expect((await itemsOf(BURGERS))[0].perServing).toBe(1 / 3);
  });

  it("copies a host recipe used by another event; the other event keeps the original", async () => {
    const recipeId = await customRecipe();
    const otherEvent = await secondEvent();
    const { dishId } = await addDishToEvent(db, "host-1", eventId, recipeId);
    const other = await addDishToEvent(db, "host-1", otherEvent, recipeId);
    const [cabbage] = await itemsOf(recipeId);
    await db
      .insert(shoppingState)
      .values({ eventId, recipeItemId: cabbage.id, checked: true, actualCents: 275 });
    await db
      .insert(shoppingState)
      .values({ eventId: otherEvent, recipeItemId: cabbage.id, checked: true, actualCents: 111 });

    await updateDish(db, "host-1", eventId, dishId, {
      servingsPerPerson: 2,
      itemAmounts: { [cabbage.id]: 0.9 },
    });

    // This event: new copy with the new amount and re-keyed state.
    const mine = await dishRow(dishId);
    expect(mine.recipeId).not.toBe(recipeId);
    expect(mine.servingsPerPerson).toBe(2);
    const copyItems = await itemsOf(mine.recipeId);
    expect(copyItems.map((i) => i.name)).toEqual(["Cabbage", "Dressing"]);
    expect(copyItems[0].perServing).toBe(0.9);
    const [copy] = await db.select().from(recipes).where(eq(recipes.id, mine.recipeId));
    expect(copy.ownerId).toBe("host-1");
    const myState = await db.select().from(shoppingState).where(eq(shoppingState.eventId, eventId));
    expect(myState).toHaveLength(1);
    expect(myState[0]).toMatchObject({
      recipeItemId: copyItems[0].id,
      checked: true,
      actualCents: 275,
    });

    // The other event is untouched.
    expect((await dishRow(other.dishId)).recipeId).toBe(recipeId);
    expect((await dishRow(other.dishId)).servingsPerPerson).toBe(0.5);
    expect((await itemsOf(recipeId))[0].perServing).toBe(0.25);
    const theirState = await db
      .select()
      .from(shoppingState)
      .where(eq(shoppingState.eventId, otherEvent));
    expect(theirState).toEqual([
      { eventId: otherEvent, recipeItemId: cabbage.id, checked: true, checkedQty: null, actualCents: 111 },
    ]);
  });

  it("edits a host recipe in place when only this event uses it (no new recipe row)", async () => {
    const recipeId = await customRecipe();
    await secondEvent(); // exists, but does not use the recipe
    const { dishId } = await addDishToEvent(db, "host-1", eventId, recipeId);
    const [cabbage] = await itemsOf(recipeId);
    await db
      .insert(shoppingState)
      .values({ eventId, recipeItemId: cabbage.id, checked: true, actualCents: 275 });
    const before = (await db.select().from(recipes)).length;

    await updateDish(db, "host-1", eventId, dishId, {
      servingsPerPerson: 1,
      itemAmounts: { [cabbage.id]: 0.5 },
    });

    expect((await dishRow(dishId)).recipeId).toBe(recipeId);
    expect((await db.select().from(recipes)).length).toBe(before);
    expect((await itemsOf(recipeId))[0].perServing).toBe(0.5);
    const [state] = await db.select().from(shoppingState);
    expect(state.recipeItemId).toBe(cabbage.id);
  });

  it("throws NotFoundError for another host, and for a dish on a different event", async () => {
    const { dishId } = await addDishToEvent(db, "host-1", eventId, BURGERS);
    const input = { servingsPerPerson: 2, itemAmounts: starterAmounts(0.5) };
    await expect(updateDish(db, "host-2", eventId, dishId, input)).rejects.toBeInstanceOf(
      NotFoundError,
    );
    const { id: other } = await createEvent(db, "host-1", {
      title: "Other",
      startsAt: new Date("2026-08-04T18:00:00Z"),
      location: "Park",
      hostName: "Will",
    });
    await expect(updateDish(db, "host-1", other, dishId, input)).rejects.toBeInstanceOf(
      NotFoundError,
    );
    await expect(updateDish(db, "host-1", eventId, "nope", input)).rejects.toBeInstanceOf(
      NotFoundError,
    );
    // Nothing cloned, nothing changed.
    expect((await dishRow(dishId)).recipeId).toBe(BURGERS);
    expect(await db.select().from(recipes)).toHaveLength(LIBRARY);
  });

  it("accepts 0 to skip an ingredient but rejects negatives and junk", async () => {
    const { dishId } = await addDishToEvent(db, "host-1", eventId, BURGERS);
    for (const bad of [-1, Number.NaN, Number.POSITIVE_INFINITY]) {
      await expect(
        updateDish(db, "host-1", eventId, dishId, {
          servingsPerPerson: 1,
          itemAmounts: starterAmounts(bad),
        }),
      ).rejects.toBeInstanceOf(ValidationError);
    }
    await updateDish(db, "host-1", eventId, dishId, {
      servingsPerPerson: 1,
      itemAmounts: starterAmounts(0),
    });
    const copy = (await db.select().from(recipes).where(eq(recipes.ownerId, "host-1")))[0];
    expect((await itemsOf(copy.id))[0].perServing).toBe(0);
    expect((await dishRow(dishId)).recipeId).toBe(copy.id);
  });

  it("rejects servingsPerPerson of 0 or less with a clear message, and over 20", async () => {
    const { dishId } = await addDishToEvent(db, "host-1", eventId, BURGERS);
    for (const bad of [0, -0.5, Number.NaN, Number.POSITIVE_INFINITY]) {
      await expect(
        updateDish(db, "host-1", eventId, dishId, { servingsPerPerson: bad, itemAmounts: {} }),
      ).rejects.toThrow("Set at least a little per person, or remove the dish");
    }
    await expect(
      updateDish(db, "host-1", eventId, dishId, { servingsPerPerson: 20.5, itemAmounts: {} }),
    ).rejects.toBeInstanceOf(ValidationError);
    await updateDish(db, "host-1", eventId, dishId, { servingsPerPerson: 20, itemAmounts: {} });
    expect((await dishRow(dishId)).servingsPerPerson).toBe(20);
  });

  it("rejects an item id that is not in the dish's recipe", async () => {
    const { dishId } = await addDishToEvent(db, "host-1", eventId, BURGERS);
    await expect(
      updateDish(db, "host-1", eventId, dishId, {
        servingsPerPerson: 1,
        itemAmounts: { "someone-elses-item": 1 },
      }),
    ).rejects.toBeInstanceOf(ValidationError);
    expect(await db.select().from(recipes)).toHaveLength(LIBRARY);
  });
});

describe("createCustomRecipe", () => {
  it("creates a host-owned recipe with ordered items", async () => {
    const recipeId = await customRecipe("host-1", "  Coleslaw  ");
    const [row] = await db.select().from(recipes).where(eq(recipes.id, recipeId));
    expect(row).toMatchObject({
      ownerId: "host-1",
      name: "Coleslaw",
      emoji: "🥗",
      defaultServingsPerPerson: 0.5,
    });
    const items = await itemsOf(recipeId);
    expect(items.map((i) => [i.name, i.position])).toEqual([
      ["Cabbage", 0],
      ["Dressing", 1],
    ]);
  });

  it("rejects bad names, emoji, servings and item counts", async () => {
    const base = { name: "Slaw", emoji: "🥗", defaultServingsPerPerson: 1, items: [slaw] };
    const bad = [
      { ...base, name: "   " },
      { ...base, name: "x".repeat(81) },
      { ...base, emoji: " " },
      { ...base, defaultServingsPerPerson: -1 },
      { ...base, defaultServingsPerPerson: 21 },
      { ...base, defaultServingsPerPerson: Number.NaN },
      { ...base, items: [] },
      { ...base, items: Array.from({ length: 31 }, () => slaw) },
    ];
    for (const input of bad) {
      await expect(createCustomRecipe(db, "host-1", input)).rejects.toBeInstanceOf(ValidationError);
    }
    const ok = { ...base, items: Array.from({ length: 30 }, () => slaw) };
    await expect(createCustomRecipe(db, "host-1", ok)).resolves.toBeDefined();
  });

  it("rejects bad item fields", async () => {
    const base = { name: "Slaw", emoji: "🥗", defaultServingsPerPerson: 1 };
    const badItems: Partial<NewItem>[] = [
      { name: " " },
      { name: "x".repeat(81) },
      { emoji: "" },
      { unit: " " },
      { buyUnit: "" },
      { perServing: -1 },
      { perServing: Number.POSITIVE_INFINITY },
      { unitsPerBuy: 0 },
      { unitsPerBuy: Number.NaN },
      { priceCents: -1 },
      { priceCents: 299.5 },
      { priceCents: 1_000_001 },
      { priceCents: Number.POSITIVE_INFINITY },
      { priceCents: Number.NaN },
    ];
    for (const patch of badItems) {
      await expect(
        createCustomRecipe(db, "host-1", { ...base, items: [{ ...slaw, ...patch }] }),
      ).rejects.toBeInstanceOf(ValidationError);
    }
    expect(await db.select().from(recipes)).toHaveLength(LIBRARY); // only the starter
  });

  it("saves optional steps, tips, times and description", async () => {
    const { recipeId } = await createCustomRecipe(db, "host-1", {
      name: "Coleslaw",
      emoji: "🥗",
      defaultServingsPerPerson: 1,
      items: [slaw],
      description: "  Crunchy and sharp  ",
      prepMinutes: 10,
      cookMinutes: 0,
      steps: [" Shred the cabbage. ", "", "Toss with dressing."],
      tips: ["Make it ahead."],
      equipment: ["Big bowl"],
    });
    const [row] = await db.select().from(recipes).where(eq(recipes.id, recipeId));
    expect(row).toMatchObject({
      description: "Crunchy and sharp",
      prepMinutes: 10,
      cookMinutes: 0,
      steps: ["Shred the cabbage.", "Toss with dressing."],
      tips: ["Make it ahead."],
      equipment: ["Big bowl"],
      originRecipeId: null,
    });
    const menu = await getMenu(db, "host-1", eventId);
    expect(menu.available.find((r) => r.id === recipeId)?.steps).toEqual([
      "Shred the cabbage.",
      "Toss with dressing.",
    ]);
  });

  it("rejects a bad minute count and keeps a blank time as no estimate", async () => {
    const base = { name: "Slaw", emoji: "🥗", defaultServingsPerPerson: 1, items: [slaw] };
    for (const prepMinutes of [-1, 1.5, 24 * 60 + 1]) {
      await expect(
        createCustomRecipe(db, "host-1", { ...base, prepMinutes }),
      ).rejects.toBeInstanceOf(ValidationError);
    }
    const { recipeId } = await createCustomRecipe(db, "host-1", {
      ...base,
      prepMinutes: null,
      cookMinutes: undefined,
      steps: [],
    });
    const [row] = await db.select().from(recipes).where(eq(recipes.id, recipeId));
    expect(row.prepMinutes).toBeNull();
    expect(row.cookMinutes).toBeNull();
    expect(row.steps).toEqual([]);
  });

  it("accepts a free item (priceCents 0) such as ice", async () => {
    const { recipeId } = await createCustomRecipe(db, "host-1", {
      name: "Drinks",
      emoji: "🥤",
      defaultServingsPerPerson: 1,
      items: [{ ...slaw, name: "Ice", priceCents: 0 }],
    });
    expect((await itemsOf(recipeId))[0].priceCents).toBe(0);
  });
});

describe("removeDish", () => {
  it("deletes the dish and its event shopping state but keeps the recipe and other dishes", async () => {
    const recipeId = await customRecipe();
    const { dishId } = await addDishToEvent(db, "host-1", eventId, recipeId);
    const burgers = await addDishToEvent(db, "host-1", eventId, BURGERS);
    const [cabbage] = await itemsOf(recipeId);
    await db.insert(shoppingState).values([
      { eventId, recipeItemId: cabbage.id, checked: true, actualCents: 250 },
      { eventId, recipeItemId: STARTER_BEEF, checked: true, actualCents: 5000 },
    ]);

    await removeDish(db, "host-1", eventId, dishId);

    expect(await dishRow(dishId)).toBeUndefined();
    expect(await dishRow(burgers.dishId)).toBeDefined();
    expect((await db.select().from(recipes).where(eq(recipes.id, recipeId))).length).toBe(1);
    expect(await itemsOf(recipeId)).toHaveLength(2);
    const state = await db.select().from(shoppingState);
    expect(state.map((s) => s.recipeItemId)).toEqual([STARTER_BEEF]);
  });

  it("throws NotFoundError for another host and changes nothing", async () => {
    const { dishId } = await addDishToEvent(db, "host-1", eventId, BURGERS);
    await expect(removeDish(db, "host-2", eventId, dishId)).rejects.toBeInstanceOf(NotFoundError);
    await expect(removeDish(db, "host-1", eventId, "nope")).rejects.toBeInstanceOf(NotFoundError);
    expect(await dishRow(dishId)).toBeDefined();
  });
});

describe("getMenu", () => {
  it("lists the event's dishes and the recipes still available to add", async () => {
    const mine = await customRecipe();
    await customRecipe("host-2", "Theirs");
    let menu = await getMenu(db, "host-1", eventId);
    expect(menu.dishes).toEqual([]);
    expect(menu.available.map((r) => r.id).sort()).toEqual(
      [...STARTER_RECIPES.map((r) => r.id), mine].sort(),
    );

    const { dishId } = await addDishToEvent(db, "host-1", eventId, BURGERS);
    menu = await getMenu(db, "host-1", eventId);
    expect(menu.available.map((r) => r.id).sort()).toEqual(
      [...STARTER_RECIPES.filter((r) => r.id !== BURGERS).map((r) => r.id), mine].sort(),
    );
    expect(menu.dishes).toHaveLength(1);
    expect(menu.dishes[0]).toMatchObject({
      dishId,
      servingsPerPerson: 1.5,
      isStarter: true,
      recipe: { id: BURGERS, name: "Burgers" },
    });
    expect(menu.dishes[0].recipe.items[0].id).toBe(STARTER_BEEF);

    await updateDish(db, "host-1", eventId, dishId, {
      servingsPerPerson: 1.5,
      itemAmounts: starterAmounts(0.4),
    });
    menu = await getMenu(db, "host-1", eventId);
    // A copy of a starter keeps the pill and its section, and hides the original from the picker.
    expect(menu.dishes[0].isStarter).toBe(true);
    expect(menu.dishes[0].recipe.category).toBe("Grill");
    expect(menu.dishes[0].recipe.items[0].perServing).toBe(0.4);
    expect(menu.available.map((r) => r.id)).not.toContain(BURGERS);
    expect(menu.available.some((r) => r.id === menu.dishes[0].recipe.id)).toBe(false);
  });

  it("throws NotFoundError for another host's event", async () => {
    await expect(getMenu(db, "host-2", eventId)).rejects.toBeInstanceOf(NotFoundError);
  });
});
