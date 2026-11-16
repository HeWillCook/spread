import type { Recipe } from './recipes';

export interface DishPlan {
  recipe: Recipe;
  servingsPerPerson: number;
}

/** One ingredient on one dish that feeds a shopping line. */
export interface ShoppingSource {
  itemId: string;
  recipeId: string;
  recipeName: string;
}

export interface ShoppingLine {
  /**
   * Stable primary id: the first of `itemIds` (sorted). Existing callers key
   * ticks and prices off this; a merged line's other ids live in `itemIds`.
   */
  itemId: string;
  /** The first contributing dish; kept so per-dish views still group. */
  recipeId: string;
  name: string;
  emoji: string;
  /** The largest servings count among the dishes that contributed. */
  servings: number;
  /** Total recipe units needed across every contributing dish. */
  needed: number;
  neededUnit: string;
  /** Whole buy units, rounded up once after the needs are summed. */
  buyQty: number;
  buyUnit: string;
  unitsPerBuy: number;
  estCostCents: number;
  /** Every contributing recipe item id, sorted; `itemId` is the first. */
  itemIds: string[];
  /** The dishes this line came from, in menu order. */
  sources: ShoppingSource[];
}

// Subtracted before ceil so float noise (e.g. 0.1 * 3 / 0.3 = 1.0000000000000002) doesn't buy an extra unit.
const EPSILON = 1e-9;

/** Round up to a whole number, ignoring float noise. Never negative (and never -0). */
function ceilQty(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.ceil(value - EPSILON));
}

/** "  Red  Onion " -> "red onion". Names are compared case- and space-insensitively. */
export function normalizeItemName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
}

/** Display form: trimmed with single spaces, keeping the recipe's capitalisation. */
function displayName(name: string): string {
  return name.trim().replace(/\s+/g, ' ');
}

/**
 * Why two ingredient rows can share one line: same normalised name, same recipe
 * unit, and the same thing in the shop (buy unit plus how much it holds). Rows
 * that differ stay separate; the amount is only rounded up after summing.
 */
function mergeKey(name: string, unit: string, buyUnit: string, unitsPerBuy: number): string {
  return [normalizeItemName(name), unit.trim().toLowerCase(), buyUnit.trim().toLowerCase(), unitsPerBuy].join('|');
}

interface Accumulator {
  line: ShoppingLine;
  /** Price per buy unit; the first contributor wins (the library keeps these equal). */
  priceCents: number;
}

/**
 * One line per ingredient you'd actually pick off a shelf, not one per recipe
 * item: "Onion" from burgers, hot dogs and brats becomes a single line with the
 * summed need, rounded up to buy units exactly once (so 36 buns is 5 packs, not
 * 3 + 3).
 */
export function buildShoppingList(dishes: DishPlan[], headcount: number): ShoppingLine[] {
  const byKey = new Map<string, Accumulator>();
  const order: Accumulator[] = [];

  for (const { recipe, servingsPerPerson } of dishes) {
    const servings = ceilQty(headcount * servingsPerPerson);
    for (const item of recipe.items) {
      const contribution = servings * item.perServing;
      const key = mergeKey(item.name, item.unit, item.buyUnit, item.unitsPerBuy);
      const existing = byKey.get(key);
      if (existing) {
        existing.line.needed += contribution;
        existing.line.servings = Math.max(existing.line.servings, servings);
        existing.line.sources.push({
          itemId: item.id,
          recipeId: recipe.id,
          recipeName: recipe.name,
        });
        existing.line.itemIds.push(item.id);
        continue;
      }
      const accumulated: Accumulator = {
        priceCents: item.priceCents,
        line: {
          itemId: item.id,
          recipeId: recipe.id,
          name: displayName(item.name),
          emoji: item.emoji,
          servings,
          needed: contribution,
          neededUnit: item.unit,
          buyQty: 0,
          buyUnit: item.buyUnit,
          unitsPerBuy: item.unitsPerBuy,
          estCostCents: 0,
          itemIds: [item.id],
          sources: [{ itemId: item.id, recipeId: recipe.id, recipeName: recipe.name }],
        },
      };
      byKey.set(key, accumulated);
      order.push(accumulated);
    }
  }

  return order.map(({ line, priceCents }) => {
    const buyQty = line.unitsPerBuy > 0 ? ceilQty(line.needed / line.unitsPerBuy) : 0;
    const itemIds = [...line.itemIds].sort();
    return {
      ...line,
      itemId: itemIds[0],
      itemIds,
      buyQty,
      estCostCents: buyQty * priceCents,
    };
  });
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
