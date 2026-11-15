import { describe, expect, it } from "vitest";
import { buildShoppingList } from "@/domain/shopping";
import { grillRecipes } from "./grill";
import { handheldRecipes } from "./handhelds";
import { sideRecipes } from "./sides";
import { dessertDrinkRecipes } from "./desserts-drinks";
import type { StarterRecipe } from "./types";

/**
 * Per-recipe checks that any one group can run on its own, before every group is filled.
 * Run with: npx vitest run src/domain/recipes/groups.test.ts
 */
const MAX_ITEM_AMOUNT = 50;
const MAX_BUY_UNITS = 500;
const MAX_PRICE_CENTS = 10_000;

const GROUPS: Record<string, StarterRecipe[]> = {
  grill: grillRecipes,
  handhelds: handheldRecipes,
  sides: sideRecipes,
  "desserts & drinks": dessertDrinkRecipes,
};

describe("recipe groups", () => {
  for (const [groupName, recipes] of Object.entries(GROUPS)) {
    describe(groupName, () => {
      it("has complete, sensible text and numbers", () => {
        for (const recipe of recipes) {
          expect(recipe.name.trim().length, recipe.id).toBeGreaterThan(2);
          expect(recipe.emoji.trim().length, recipe.id).toBeGreaterThan(0);
          expect(recipe.defaultServingsPerPerson, recipe.id).toBeGreaterThan(0);
          expect(recipe.defaultServingsPerPerson, recipe.id).toBeLessThanOrEqual(3);
          expect(recipe.items.length, recipe.id).toBeGreaterThanOrEqual(2);
          expect(recipe.items.length, recipe.id).toBeLessThanOrEqual(12);

          for (const item of recipe.items) {
            const where = `${recipe.id}/${item.name}`;
            expect(item.name.trim().length, where).toBeGreaterThan(1);
            expect(item.emoji.trim().length, where).toBeGreaterThan(0);
            expect(item.unit.trim().length, where).toBeGreaterThan(0);
            expect(item.buyUnit.trim().length, where).toBeGreaterThan(0);
            expect(item.perServing, where).toBeGreaterThan(0);
            expect(item.perServing, where).toBeLessThanOrEqual(MAX_ITEM_AMOUNT);
            expect(item.unitsPerBuy, where).toBeGreaterThan(0);
            expect(item.unitsPerBuy, where).toBeLessThanOrEqual(MAX_BUY_UNITS);
            expect(Number.isInteger(item.priceCents), where).toBe(true);
            expect(item.priceCents, where).toBeGreaterThanOrEqual(0);
            expect(item.priceCents, where).toBeLessThanOrEqual(MAX_PRICE_CENTS);
          }
        }
      });

      it("costs a plausible amount per person at its default appetite", () => {
        for (const recipe of recipes) {
          const list = buildShoppingList(
            [{ recipe, servingsPerPerson: recipe.defaultServingsPerPerson }],
            10,
          );
          const cents = list.reduce((sum, line) => sum + line.estCostCents, 0);
          const perPerson = cents / 10;
          expect(perPerson, recipe.id).toBeGreaterThanOrEqual(60);
          expect(perPerson, recipe.id).toBeLessThanOrEqual(1500);
        }
      });

      it("scales cleanly to a shopping list for any headcount", () => {
        for (const people of [1, 4, 10, 25]) {
          for (const recipe of recipes) {
            const lines = buildShoppingList(
              [{ recipe, servingsPerPerson: recipe.defaultServingsPerPerson }],
              people,
            );
            expect(lines.length, recipe.id).toBe(recipe.items.length);
            for (const line of lines) {
              expect(Number.isFinite(line.needed), recipe.id).toBe(true);
              expect(line.buyQty, recipe.id).toBeGreaterThanOrEqual(1);
              expect(Number.isInteger(line.buyQty), recipe.id).toBe(true);
              expect(Number.isInteger(line.servings), recipe.id).toBe(true);
              expect(line.servings, recipe.id).toBeGreaterThanOrEqual(people);
            }
          }
        }
      });
    });
  }
});
