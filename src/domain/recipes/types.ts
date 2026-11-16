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
  /** One-line pitch shown in the picker preview, e.g. "Smash-style patties with all the fixings". */
  description?: string;
  /** Hands-on prep time in minutes (chopping, mixing, forming). */
  prepMinutes?: number;
  /** Cook / bake / chill time in minutes. */
  cookMinutes?: number;
  /** Ordered how-to steps. Each is one complete instruction a novice can follow. */
  steps?: string[];
  /** Short practical tips: make-ahead, doneness temps, scaling for a crowd, swaps. */
  tips?: string[];
  /** Equipment needed, e.g. "Grill", "Instant-read thermometer", "9x13 pan". */
  equipment?: string[];
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

/** Starter recipes must ship complete instructions. */
export type CompleteStarterRecipe = StarterRecipe &
  Required<Pick<Recipe, "description" | "prepMinutes" | "cookMinutes" | "steps" | "tips" | "equipment">>;
