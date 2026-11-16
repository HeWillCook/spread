import { dessertDrinkRecipes } from "./desserts-drinks";
import { grillRecipes } from "./grill";
import { handheldRecipes } from "./handhelds";
import { sideRecipes } from "./sides";
import type { CompleteStarterRecipe, Recipe } from "./types";

export type {
  CompleteStarterRecipe,
  Recipe,
  RecipeCategory,
  RecipeItem,
  StarterRecipe,
} from "./types";

/** Every built-in recipe, in picker order. */
export const STARTER_RECIPES: CompleteStarterRecipe[] = [
  ...grillRecipes,
  ...handheldRecipes,
  ...sideRecipes,
  ...dessertDrinkRecipes,
];

/** Categories in the order the Menu picker shows them, with host-owned recipes last. */
export const RECIPE_GROUPS = [
  "Grill",
  "Tacos & handhelds",
  "Sides & salads",
  "Desserts",
  "Drinks",
  "Brunch",
  "Your dishes",
] as const;

export type RecipeGroup = (typeof RECIPE_GROUPS)[number];

const CATEGORY_BY_ID = new Map(STARTER_RECIPES.map((recipe) => [recipe.id, recipe.category]));

/**
 * Grouping for the picker. A recipe copied for editing gets a new id, so it (like a
 * host's own recipe) falls under "Your dishes" rather than its original starter section.
 */
export function recipeCategory(recipe: Recipe): RecipeGroup {
  return CATEGORY_BY_ID.get(recipe.id) ?? "Your dishes";
}

/** True for the built-in library (a starter that has not been copied). */
export function isStarterRecipe(recipe: Recipe): boolean {
  return CATEGORY_BY_ID.has(recipe.id);
}
