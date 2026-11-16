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

/** One recipe item on one dish, unmerged: what that dish needs on its own. */
export interface DishNeed {
  itemId: string;
  recipeId: string;
  recipeName: string;
  name: string;
  emoji: string;
  /** Whole servings this dish makes at this headcount. */
  servings: number;
  /** Recipe units this dish needs by itself. */
  needed: number;
  neededUnit: string;
  /** Whole buy units if you bought for this dish alone. */
  buyQty: number;
  buyUnit: string;
  unitsPerBuy: number;
  /** Price of one buy unit, in integer cents. */
  priceCents: number;
  /** What this dish's own (separately rounded) buy would cost. */
  estCostCents: number;
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
 * One line per recipe item, per dish: the amounts each dish needs by itself.
 * Shopping merges these (see buildShoppingList), but per-dish views — the
 * kitchen sheet's ingredient lists, a dish's own "make" amounts — must not show
 * a shared ingredient's total from every dish on each of them.
 *
 * Both functions share this math so servings rounding and the float-noise
 * epsilon can never drift apart.
 */
export function buildDishNeeds(dishes: DishPlan[], headcount: number): DishNeed[] {
  const needs: DishNeed[] = [];
  for (const { recipe, servingsPerPerson } of dishes) {
    const servings = ceilQty(headcount * servingsPerPerson);
    for (const item of recipe.items) {
      const needed = servings * item.perServing;
      const buyQty = item.unitsPerBuy > 0 ? ceilQty(needed / item.unitsPerBuy) : 0;
      needs.push({
        itemId: item.id,
        recipeId: recipe.id,
        recipeName: recipe.name,
        name: displayName(item.name),
        emoji: item.emoji,
        servings,
        needed,
        neededUnit: item.unit,
        buyQty,
        buyUnit: item.buyUnit,
        unitsPerBuy: item.unitsPerBuy,
        priceCents: item.priceCents,
        estCostCents: buyQty * item.priceCents,
      });
    }
  }
  return needs;
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

  for (const need of buildDishNeeds(dishes, headcount)) {
    const key = mergeKey(need.name, need.neededUnit, need.buyUnit, need.unitsPerBuy);
    const existing = byKey.get(key);
    if (existing) {
      existing.line.needed += need.needed;
      existing.line.servings = Math.max(existing.line.servings, need.servings);
      existing.line.sources.push({
        itemId: need.itemId,
        recipeId: need.recipeId,
        recipeName: need.recipeName,
      });
      existing.line.itemIds.push(need.itemId);
      continue;
    }
    const accumulated: Accumulator = {
      priceCents: need.priceCents,
      line: {
        itemId: need.itemId,
        recipeId: need.recipeId,
        name: need.name,
        emoji: need.emoji,
        servings: need.servings,
        needed: need.needed,
        neededUnit: need.neededUnit,
        buyQty: 0,
        buyUnit: need.buyUnit,
        unitsPerBuy: need.unitsPerBuy,
        estCostCents: 0,
        itemIds: [need.itemId],
        sources: [
          { itemId: need.itemId, recipeId: need.recipeId, recipeName: need.recipeName },
        ],
      },
    };
    byKey.set(key, accumulated);
    order.push(accumulated);
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
