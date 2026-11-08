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

export const STARTER_RECIPES: Recipe[] = [
  {
    id: 'starter-burgers',
    name: 'Burgers',
    emoji: '🍔',
    defaultServingsPerPerson: 1.5,
    items: [
      {
        id: 'starter-burgers-beef',
        name: 'Ground beef',
        emoji: '🥩',
        perServing: 1 / 3,
        unit: 'lb',
        buyUnit: 'lb',
        unitsPerBuy: 1,
        priceCents: 650,
      },
      {
        id: 'starter-burgers-buns',
        name: 'Burger buns',
        emoji: '🍞',
        perServing: 1,
        unit: 'bun',
        buyUnit: 'pack',
        unitsPerBuy: 8,
        priceCents: 350,
      },
      {
        id: 'starter-burgers-cheese',
        name: 'Cheese slices',
        emoji: '🧀',
        perServing: 1,
        unit: 'slice',
        buyUnit: 'pack',
        unitsPerBuy: 24,
        priceCents: 600,
      },
      {
        id: 'starter-burgers-onion',
        name: 'Onion',
        emoji: '🧅',
        perServing: 1 / 6,
        unit: 'onion',
        buyUnit: 'each',
        unitsPerBuy: 1,
        priceCents: 100,
      },
      {
        id: 'starter-burgers-jalapeno',
        name: 'Jalapeño',
        emoji: '🌶️',
        perServing: 1 / 4,
        unit: 'pepper',
        buyUnit: 'each',
        unitsPerBuy: 1,
        priceCents: 50,
      },
    ],
  },
];
