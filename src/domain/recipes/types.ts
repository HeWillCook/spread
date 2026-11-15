export interface RecipeItem {
  id: string;
  name: string;
  emoji: string;
  /** Amount per serving, in recipe units (e.g. 0.3333 'lb'). */
  perServing: number;
  unit: string;
  /** What you buy at the store, e.g. 'pack'. */
  buyUnit: string;
  /** How many recipe units one buy unit contains, e.g. 8 buns per pack. */
  unitsPerBuy: number;
  /** Price per buy unit, in integer cents. */
  priceCents: number;
}

export interface Recipe {
  id: string;
  name: string;
  emoji: string;
  defaultServingsPerPerson: number;
  items: RecipeItem[];
}

/** Sections the Menu picker groups starter recipes into. */
export type RecipeCategory =
  | "Grill"
  | "Tacos & handhelds"
  | "Sides & salads"
  | "Desserts"
  | "Drinks"
  | "Brunch";

export interface StarterRecipe extends Recipe {
  category: RecipeCategory;
}
