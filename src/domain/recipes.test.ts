import { describe, expect, it } from "vitest";
import { RECIPE_GROUPS, STARTER_RECIPES, recipeCategory } from "./recipes";

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
});
