import type { Recipe } from './recipes';

export interface DishPlan {
  recipe: Recipe;
  servingsPerPerson: number;
}

export interface ShoppingLine {
  itemId: string;
  recipeId: string;
  name: string;
  emoji: string;
  servings: number;
  needed: number;
  neededUnit: string;
  buyQty: number;
  buyUnit: string;
  unitsPerBuy: number;
  estCostCents: number;
}

// Subtracted before ceil so float noise (e.g. 0.1 * 3 / 0.3 = 1.0000000000000002) doesn't buy an extra unit.
const EPSILON = 1e-9;

/** Round up to a whole number, ignoring float noise. Never negative (and never -0). */
function ceilQty(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.ceil(value - EPSILON));
}

export function buildShoppingList(dishes: DishPlan[], headcount: number): ShoppingLine[] {
  const lines: ShoppingLine[] = [];
  for (const { recipe, servingsPerPerson } of dishes) {
    const servings = ceilQty(headcount * servingsPerPerson);
    for (const item of recipe.items) {
      const needed = servings * item.perServing;
      const buyQty = item.unitsPerBuy > 0 ? ceilQty(needed / item.unitsPerBuy) : 0;
      lines.push({
        itemId: item.id,
        recipeId: recipe.id,
        name: item.name,
        emoji: item.emoji,
        servings,
        needed,
        neededUnit: item.unit,
        buyQty,
        buyUnit: item.buyUnit,
        unitsPerBuy: item.unitsPerBuy,
        estCostCents: buyQty * item.priceCents,
      });
    }
  }
  return lines;
}

/** Sum of each line's actual spend (if recorded) or estimate, plus extras. Integer cents. */
export function totalCents(
  lines: ShoppingLine[],
  actualByItemId: Record<string, number>,
  extrasCents: number[],
): number {
  let total = 0;
  for (const line of lines) {
    total += actualByItemId[line.itemId] ?? line.estCostCents;
  }
  for (const extra of extrasCents) total += extra;
  return total;
}
