// @vitest-environment node
import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import type { Db } from "@/db/client";
import { extraCosts, recipeItems, shoppingState } from "@/db/schema";
import { seedStarterRecipes } from "@/db/seed";
import { createTestDb } from "@/db/test-db";
import { NotFoundError, ValidationError } from "./errors";
import { createEvent } from "./events";
import { setMaybePercent } from "./guestsOverview";
import { addDishToEvent, createCustomRecipe, getMenu, updateDish } from "./menu";
import { submitRsvp } from "./rsvp";
import {
  addExtraCost,
  getShoppingPlan,
  removeExtraCost,
  setActualCost,
  setChecked,
} from "./shopping";

const BEEF = "starter-burgers-beef";
const BUNS = "starter-burgers-buns";

let db: Db;
let eventId: string;
let shareCode: string;

beforeEach(async () => {
  db = await createTestDb();
  await seedStarterRecipes(db);
  ({ id: eventId, shareCode } = await createEvent(db, "host-1", {
    title: "Cookout",
    startsAt: new Date("2026-07-04T18:00:00Z"),
    location: "Backyard",
    hostName: "Will",
  }));
});

/** 12 yes heads (8 guests + 4 plus-ones) and 5 maybe heads (3 guests + 2 plus-ones). */
async function seedTwelveYesFiveMaybe() {
  for (let i = 1; i <= 8; i++) {
    await submitRsvp(db, {
      shareCode,
      name: `Yes ${i}`,
      status: "yes",
      plusOneNames: i <= 4 ? [`Friend ${i}`] : [],
    });
  }
  await submitRsvp(db, { shareCode, name: "Maybe 1", status: "maybe", plusOneNames: ["Mf1", "Mf2"] });
  await submitRsvp(db, { shareCode, name: "Maybe 2", status: "maybe", plusOneNames: [] });
  await submitRsvp(db, { shareCode, name: "Maybe 3", status: "maybe", plusOneNames: [] });
}

async function seedBurgerEvent() {
  await seedTwelveYesFiveMaybe();
  await addDishToEvent(db, "host-1", eventId, "starter-burgers");
}

function line(plan: Awaited<ReturnType<typeof getShoppingPlan>>, itemId: string) {
  const found = plan.lines.find((l) => l.itemId === itemId);
  if (!found) throw new Error(`no line ${itemId}`);
  return found;
}

describe("getShoppingPlan", () => {
  it("12 yes + 5 maybe with burgers buys 8 lb beef, 3 packs buns, ... for 7550", async () => {
    await seedBurgerEvent();
    const plan = await getShoppingPlan(db, "host-1", eventId);
    expect(plan.headcount).toMatchObject({ confirmed: 12, planFor: 15, low: 12, high: 17 });
    expect(plan.lines.map((l) => [l.name, l.buyQty, l.buyUnit])).toEqual([
      ["Ground beef", 8, "lb"],
      ["Burger buns", 3, "pack"],
      ["Cheese slices", 1, "pack"],
      ["Onion", 4, "each"],
      ["Jalapeño", 6, "each"],
    ]);
    expect(plan.lines.every((l) => !l.checked && l.actualCents === null)).toBe(true);
    expect(plan.extras).toEqual([]);
    expect(plan.totalCents).toBe(7550);
  });

  it("follows the event's maybe percent", async () => {
    await seedBurgerEvent();
    await setMaybePercent(db, "host-1", eventId, 0);
    const plan = await getShoppingPlan(db, "host-1", eventId);
    expect(plan.headcount.planFor).toBe(12);
    // 18 servings: beef 6 lb.
    expect(line(plan, BEEF).buyQty).toBe(6);
  });

  it("an event with no dishes has no lines and totals only its extras", async () => {
    await seedTwelveYesFiveMaybe();
    expect(await getShoppingPlan(db, "host-1", eventId)).toMatchObject({
      lines: [],
      extras: [],
      totalCents: 0,
    });
    await addExtraCost(db, "host-1", eventId, "Ice", 800);
    const plan = await getShoppingPlan(db, "host-1", eventId);
    expect(plan.lines).toEqual([]);
    expect(plan.totalCents).toBe(800);
  });

  it("another host's event is a NotFoundError", async () => {
    await seedBurgerEvent();
    await expect(getShoppingPlan(db, "host-2", eventId)).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe("setChecked / setActualCost", () => {
  beforeEach(seedBurgerEvent);

  it("ticking persists, captures the quantity bought, and doesn't change the total", async () => {
    await setChecked(db, "host-1", eventId, BEEF, true);
    const plan = await getShoppingPlan(db, "host-1", eventId);
    expect(line(plan, BEEF)).toMatchObject({
      checked: true,
      checkedQty: 8,
      needsReview: false,
      actualCents: null,
    });
    expect(line(plan, BUNS).checked).toBe(false);
    expect(plan.totalCents).toBe(7550);
    expect(plan.totalIsProvisional).toBe(false);
    await setChecked(db, "host-1", eventId, BEEF, false);
    expect(line(await getShoppingPlan(db, "host-1", eventId), BEEF)).toMatchObject({
      checked: false,
      checkedQty: null,
      needsReview: false,
    });
  });

  it("an actual price replaces the estimate in the total", async () => {
    await setActualCost(db, "host-1", eventId, BEEF, 4999);
    const plan = await getShoppingPlan(db, "host-1", eventId);
    expect(line(plan, BEEF)).toMatchObject({ actualCents: 4999, checked: false });
    // 7550 - 5200 (8 lb estimate) + 4999
    expect(plan.totalCents).toBe(7550 - 5200 + 4999);
  });

  it("ticking keeps the actual price, and the price keeps the tick", async () => {
    await setActualCost(db, "host-1", eventId, BEEF, 4999);
    await setChecked(db, "host-1", eventId, BEEF, true);
    await setActualCost(db, "host-1", eventId, BEEF, 5100);
    expect(line(await getShoppingPlan(db, "host-1", eventId), BEEF)).toMatchObject({
      checked: true,
      checkedQty: 8,
      needsReview: false,
      actualCents: 5100,
    });
    expect(await db.select().from(shoppingState)).toHaveLength(1);
  });

  it("null clears only the actual price; zero is a real price", async () => {
    await setChecked(db, "host-1", eventId, BEEF, true);
    await setActualCost(db, "host-1", eventId, BEEF, 0);
    let plan = await getShoppingPlan(db, "host-1", eventId);
    expect(line(plan, BEEF).actualCents).toBe(0);
    expect(plan.totalCents).toBe(7550 - 5200);
    await setActualCost(db, "host-1", eventId, BEEF, null);
    plan = await getShoppingPlan(db, "host-1", eventId);
    expect(line(plan, BEEF)).toMatchObject({ checked: true, actualCents: null });
    expect(plan.totalCents).toBe(7550);
  });

  it("rejects negative, fractional, non-finite and absurd prices", async () => {
    for (const bad of [-1, 12.5, Number.NaN, Number.POSITIVE_INFINITY, 1_000_001]) {
      await expect(setActualCost(db, "host-1", eventId, BEEF, bad)).rejects.toBeInstanceOf(
        ValidationError,
      );
    }
    expect(await db.select().from(shoppingState)).toHaveLength(0);
  });

  it("never writes state for an item that isn't on this event's menu", async () => {
    const { recipeId } = await createCustomRecipe(db, "host-2", {
      name: "Slaw",
      emoji: "🥗",
      defaultServingsPerPerson: 1,
      items: [
        {
          name: "Cabbage",
          emoji: "🥬",
          perServing: 1,
          unit: "head",
          buyUnit: "head",
          unitsPerBuy: 1,
          priceCents: 300,
        },
      ],
    });
    const { dishId } = await addDishToEvent(db, "host-2", (await otherEvent()).id, recipeId);
    expect(dishId).toBeTruthy();
    const [foreign] = await db.select().from(recipeItems).where(eq(recipeItems.recipeId, recipeId));
    for (const itemId of [foreign.id, "nope"]) {
      await expect(setChecked(db, "host-1", eventId, itemId, true)).rejects.toBeInstanceOf(
        NotFoundError,
      );
      await expect(setActualCost(db, "host-1", eventId, itemId, 100)).rejects.toBeInstanceOf(
        NotFoundError,
      );
    }
    expect(await db.select().from(shoppingState)).toHaveLength(0);
  });

  it("another host can't tick or price", async () => {
    await expect(setChecked(db, "host-2", eventId, BEEF, true)).rejects.toBeInstanceOf(NotFoundError);
    await expect(setActualCost(db, "host-2", eventId, BEEF, 100)).rejects.toBeInstanceOf(
      NotFoundError,
    );
    expect(await db.select().from(shoppingState)).toHaveLength(0);
  });

  it("keeps a tick when the menu edit doesn't raise the quantity (copy-on-edit migrates the basis)", async () => {
    await setChecked(db, "host-1", eventId, BEEF, true);
    await setActualCost(db, "host-1", eventId, BEEF, 4999);
    const [dish] = (await getMenu(db, "host-1", eventId)).dishes;
    await updateDish(db, "host-1", eventId, dish.dishId, {
      servingsPerPerson: 1.5,
      itemAmounts: {},
    });
    const plan = await getShoppingPlan(db, "host-1", eventId);
    const beef = plan.lines.find((l) => l.name === "Ground beef")!;
    expect(beef).toMatchObject({ checked: true, checkedQty: 8, needsReview: false, actualCents: 4999 });
  });

  it("flags a tick for review when editing the dish raises the quantity, keeping the price", async () => {
    await setChecked(db, "host-1", eventId, BEEF, true);
    await setActualCost(db, "host-1", eventId, BEEF, 4999);
    const [dish] = (await getMenu(db, "host-1", eventId)).dishes;
    await updateDish(db, "host-1", eventId, dish.dishId, {
      servingsPerPerson: 2,
      itemAmounts: {},
    });
    const plan = await getShoppingPlan(db, "host-1", eventId);
    const beef = plan.lines.find((l) => l.name === "Ground beef")!;
    expect(beef).toMatchObject({
      checked: false,
      checkedQty: 8,
      needsReview: true,
      actualCents: 4999,
    });
    expect(plan.totalIsProvisional).toBe(true);
  });

  it("a new yes RSVP with 2 plus-ones raises quantities and flags the old tick for review", async () => {
    await setChecked(db, "host-1", eventId, BEEF, true);
    await setActualCost(db, "host-1", eventId, BEEF, 4999);
    const before = await getShoppingPlan(db, "host-1", eventId);
    const checkedQty = line(before, BEEF).buyQty;

    await submitRsvp(db, {
      shareCode,
      name: "Late Larry",
      status: "yes",
      plusOneNames: ["Plus A", "Plus B"],
    });

    const after = await getShoppingPlan(db, "host-1", eventId);
    expect(after.headcount.planFor).toBeGreaterThan(before.headcount.planFor);
    expect(line(after, BEEF).buyQty).toBeGreaterThan(checkedQty);
    expect(line(after, BUNS).buyQty).toBeGreaterThan(line(before, BUNS).buyQty);
    // The tick no longer covers what is needed, so it reads as unchecked until rechecked.
    expect(line(after, BEEF)).toMatchObject({
      checked: false,
      checkedQty,
      needsReview: true,
      actualCents: 4999,
    });
    expect(after.totalIsProvisional).toBe(true);
    expect(line(after, BUNS)).toMatchObject({ checked: false, actualCents: null });

    // Ticking again acknowledges the current quantity; the real price is never erased.
    await setChecked(db, "host-1", eventId, BEEF, true);
    const rechecked = await getShoppingPlan(db, "host-1", eventId);
    expect(line(rechecked, BEEF)).toMatchObject({
      checked: true,
      checkedQty: line(rechecked, BEEF).buyQty,
      needsReview: false,
      actualCents: 4999,
    });
    expect(rechecked.totalIsProvisional).toBe(false);
  });

  it("doesn't ask for a recheck when an increase stays inside the same pack count", async () => {
    await setChecked(db, "host-1", eventId, BEEF, true);
    const before = await getShoppingPlan(db, "host-1", eventId);
    await submitRsvp(db, { shareCode, name: "One More", status: "yes", plusOneNames: [] });
    const after = await getShoppingPlan(db, "host-1", eventId);
    expect(after.headcount.planFor).toBeGreaterThan(before.headcount.planFor);
    expect(line(after, BEEF).buyQty).toBe(line(before, BEEF).buyQty);
    expect(line(after, BEEF)).toMatchObject({ checked: true, needsReview: false });
    expect(after.totalIsProvisional).toBe(false);
  });

  it("keeps the tick when the quantity goes down", async () => {
    await setChecked(db, "host-1", eventId, BEEF, true);
    await setMaybePercent(db, "host-1", eventId, 0);
    const plan = await getShoppingPlan(db, "host-1", eventId);
    expect(line(plan, BEEF)).toMatchObject({
      checked: true,
      checkedQty: 8,
      needsReview: false,
    });
    expect(line(plan, BEEF).buyQty).toBe(6);
    expect(plan.totalIsProvisional).toBe(false);
  });

  it("ticking at zero headcount then adding a guest needs a review from zero", async () => {
    const empty = await createEvent(db, "host-1", {
      title: "Empty",
      startsAt: new Date("2026-07-05T18:00:00Z"),
      location: "Nowhere",
      hostName: "Will",
    });
    await addDishToEvent(db, "host-1", empty.id, "starter-burgers");
    const before = await getShoppingPlan(db, "host-1", empty.id);
    expect(before.headcount.planFor).toBe(0);
    expect(line(before, BEEF).buyQty).toBe(0);

    await setChecked(db, "host-1", empty.id, BEEF, true);
    await submitRsvp(db, {
      shareCode: empty.shareCode,
      name: "First Guest",
      status: "yes",
      plusOneNames: [],
    });

    const after = await getShoppingPlan(db, "host-1", empty.id);
    expect(line(after, BEEF).buyQty).toBeGreaterThan(0);
    expect(line(after, BEEF)).toMatchObject({
      checked: false,
      checkedQty: 0,
      needsReview: true,
    });
    expect(after.totalIsProvisional).toBe(true);
  });

  it("shows a legacy tick with no captured quantity as unchecked for a conservative recheck", async () => {
    // Rows written before quantities were captured have checked = true and no basis.
    await db.insert(shoppingState).values({ eventId, recipeItemId: BEEF, checked: true });
    const plan = await getShoppingPlan(db, "host-1", eventId);
    expect(line(plan, BEEF)).toMatchObject({
      checked: false,
      checkedQty: null,
      needsReview: true,
      actualCents: null,
    });
    expect(plan.totalIsProvisional).toBe(true);

    await setChecked(db, "host-1", eventId, BEEF, true);
    const rechecked = await getShoppingPlan(db, "host-1", eventId);
    expect(line(rechecked, BEEF)).toMatchObject({
      checked: true,
      checkedQty: line(rechecked, BEEF).buyQty,
      needsReview: false,
    });
    expect(rechecked.totalIsProvisional).toBe(false);
  });
});

async function otherEvent() {
  return createEvent(db, "host-2", {
    title: "Other",
    startsAt: new Date("2026-07-05T18:00:00Z"),
    location: "Elsewhere",
    hostName: "Pat",
  });
}

describe("extra costs", () => {
  beforeEach(seedBurgerEvent);

  it("extras add to the total, and removing one takes it back out", async () => {
    await addExtraCost(db, "host-1", eventId, "  Charcoal ", 1250);
    await addExtraCost(db, "host-1", eventId, "Ice", 800);
    let plan = await getShoppingPlan(db, "host-1", eventId);
    expect(plan.extras.map((e) => [e.label, e.amountCents])).toEqual([
      ["Charcoal", 1250],
      ["Ice", 800],
    ]);
    expect(plan.totalCents).toBe(7550 + 1250 + 800);

    await removeExtraCost(db, "host-1", eventId, plan.extras[0].id);
    plan = await getShoppingPlan(db, "host-1", eventId);
    expect(plan.extras.map((e) => e.label)).toEqual(["Ice"]);
    expect(plan.totalCents).toBe(7550 + 800);
  });

  it("rejects blank or long labels and bad amounts", async () => {
    await expect(addExtraCost(db, "host-1", eventId, "   ", 100)).rejects.toBeInstanceOf(
      ValidationError,
    );
    await expect(addExtraCost(db, "host-1", eventId, "x".repeat(81), 100)).rejects.toBeInstanceOf(
      ValidationError,
    );
    for (const bad of [-5, 1.5, Number.NaN, 1_000_001]) {
      await expect(addExtraCost(db, "host-1", eventId, "Ice", bad)).rejects.toBeInstanceOf(
        ValidationError,
      );
    }
    expect(await db.select().from(extraCosts)).toHaveLength(0);
  });

  it("another host can't add or remove extras", async () => {
    await addExtraCost(db, "host-1", eventId, "Ice", 800);
    const [extra] = await db.select().from(extraCosts);
    await expect(addExtraCost(db, "host-2", eventId, "Hat", 100)).rejects.toBeInstanceOf(
      NotFoundError,
    );
    await expect(removeExtraCost(db, "host-2", eventId, extra.id)).rejects.toBeInstanceOf(
      NotFoundError,
    );
    expect(await db.select().from(extraCosts)).toHaveLength(1);
  });

  it("can't remove an extra that belongs to a different event", async () => {
    const other = await otherEvent();
    await addExtraCost(db, "host-2", other.id, "Theirs", 100);
    const [theirs] = await db.select().from(extraCosts).where(eq(extraCosts.eventId, other.id));
    await expect(removeExtraCost(db, "host-1", eventId, theirs.id)).rejects.toBeInstanceOf(
      NotFoundError,
    );
    expect(await db.select().from(extraCosts)).toHaveLength(1);
  });
});
