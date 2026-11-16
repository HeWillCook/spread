import { describe, expect, it } from "vitest";
import { buildShoppingList } from "@/domain/shopping";
import { RECIPE_GROUPS, STARTER_RECIPES, recipeCategory } from "./recipes";

/**
 * Pantry items whose smallest retail package still dwarfs what a 10-person party needs.
 * Everything here is a bag or box the store only sells in one size, so the extra stock
 * goes back in the cupboard rather than to waste.
 */
const SINGLE_PACKAGE_PANTRY = new Set([
  "starter-coleslaw-sugar", // 1 lb bag of sugar vs. a few tablespoons of dressing
  "starter-brownies-eggs", // eggs only come by the dozen
  "starter-pancakes-eggs", // eggs only come by the dozen
  "starter-falafel-pitas-flour", // 5 lb bag is the smallest flour sold
  "starter-mac-and-cheese-flour", // same flour bag, used only for the roux
]);

describe("starter recipe library", () => {
  it("has a useful number of dishes across every group", () => {
    expect(STARTER_RECIPES.length).toBeGreaterThanOrEqual(20);
    for (const group of RECIPE_GROUPS.filter((g) => g !== "Your dishes")) {
      expect(STARTER_RECIPES.some((r) => r.category === group), group).toBe(true);
    }
  });

  it("uses unique recipe and item ids across the whole library", () => {
    const recipeIds = new Set<string>();
    const itemIds = new Set<string>();
    for (const recipe of STARTER_RECIPES) {
      expect(recipeIds.has(recipe.id), recipe.id).toBe(false);
      recipeIds.add(recipe.id);
      for (const item of recipe.items) {
        expect(itemIds.has(item.id), item.id).toBe(false);
        itemIds.add(item.id);
      }
    }
  });

  it("groups every starter under its declared category", () => {
    for (const recipe of STARTER_RECIPES) {
      expect(recipeCategory(recipe), recipe.id).toBe(recipe.category);
    }
  });

  it("describes the same ingredient the same way in every recipe", () => {
    const seen = new Map<
      string,
      { unit: string; buyUnit: string; unitsPerBuy: number; priceCents: number; id: string }
    >();
    for (const recipe of STARTER_RECIPES) {
      for (const item of recipe.items) {
        const key = item.name.trim().toLowerCase();
        const shape = {
          unit: item.unit,
          buyUnit: item.buyUnit,
          unitsPerBuy: item.unitsPerBuy,
          priceCents: item.priceCents,
        };
        const first = seen.get(key);
        if (first) {
          expect(shape, `${item.id} should match ${first.id} for "${item.name}"`).toEqual({
            unit: first.unit,
            buyUnit: first.buyUnit,
            unitsPerBuy: first.unitsPerBuy,
            priceCents: first.priceCents,
          });
        } else {
          seen.set(key, { ...shape, id: item.id });
        }
      }
    }
  });

  it("buys a practical amount of lemonade for a dozen guests", () => {
    const lemonade = STARTER_RECIPES.find((recipe) => recipe.id === "starter-lemonade");
    if (!lemonade) throw new Error("missing lemonade");
    const [line] = buildShoppingList(
      [{ recipe: lemonade, servingsPerPerson: lemonade.defaultServingsPerPerson }],
      12,
    );
    // One can of concentrate makes 48 oz of finished lemonade, and each guest drinks
    // two 12 oz servings: 24 servings x 12 oz = 288 oz, so six cans.
    expect(line.needed).toBe(288);
    expect(line.neededUnit).toBe("oz");
    expect(line.buyQty).toBe(6);
    const finishedOz = line.buyQty * line.unitsPerBuy;
    expect(finishedOz / 12).toBeGreaterThanOrEqual(20); // oz per guest
    expect(finishedOz / 12).toBeLessThanOrEqual(30);
  });

  it("does not wildly over-buy any item for a ten-person party", () => {
    for (const recipe of STARTER_RECIPES) {
      const lines = buildShoppingList(
        [{ recipe, servingsPerPerson: recipe.defaultServingsPerPerson }],
        10,
      );
      for (const line of lines) {
        if (SINGLE_PACKAGE_PANTRY.has(line.itemId)) continue;
        const needed = line.needed;
        const bought = line.buyQty * line.unitsPerBuy;
        expect(bought / needed, `${line.itemId} (${line.name})`).toBeLessThanOrEqual(6);
      }
    }
    for (const id of SINGLE_PACKAGE_PANTRY) {
      expect(
        STARTER_RECIPES.some((recipe) => recipe.items.some((item) => item.id === id)),
        id,
      ).toBe(true);
    }
  });
});
