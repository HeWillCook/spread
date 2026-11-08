import type { Headcount } from "@/domain/headcount";
import { buildShoppingList, type ShoppingLine } from "@/domain/shopping";
import type { MenuDish } from "@/services/menu";

// Units that read the same for one or many ("8 lb", "4 each").
const INVARIANT_UNITS = new Set(["lb", "lbs", "oz", "g", "kg", "ml", "l", "gal", "each", "dozen"]);

function pluralize(unit: string): string {
  const lower = unit.toLowerCase();
  if (INVARIANT_UNITS.has(lower) || lower.endsWith("s")) return unit;
  if (/(x|z|ch|sh)$/.test(lower)) return `${unit}es`;
  if (/[^aeiou]y$/.test(lower)) return `${unit.slice(0, -1)}ies`;
  return `${unit}s`;
}

/** "8 lb", "1 pack", "3 packs". */
export function formatBuyQty(qty: number, buyUnit: string): string {
  return `${qty} ${qty === 1 ? buyUnit : pluralize(buyUnit)}`;
}

/** "12 yes + ~3 from maybes · range 12–17"; clauses that add nothing are left out. */
export function headcountLine(headcount: Headcount): string {
  const fromMaybes = headcount.planFor - headcount.confirmed;
  let text = `${headcount.confirmed} yes`;
  if (fromMaybes > 0) text += ` + ~${fromMaybes} from maybes`;
  if (headcount.high > headcount.low) text += ` · range ${headcount.low}–${headcount.high}`;
  return text;
}

/** The biggest-ticket line (meat, usually); the first one wins a tie. */
export function biggestLine<T extends ShoppingLine>(lines: T[]): T | null {
  let best: T | null = null;
  for (const line of lines) {
    if (best === null || line.estCostCents > best.estCostCents) best = line;
  }
  return best;
}

/**
 * "range 6–9 lb" for one item: what to buy if only the confirmed come vs. if every
 * maybe shows up. null when the range makes no difference to this item.
 */
export function rangeNote(
  dishes: MenuDish[],
  headcount: Headcount,
  itemId: string,
  buyUnit: string,
): string | null {
  if (headcount.high <= headcount.low) return null;
  const plans = dishes.map((d) => ({ recipe: d.recipe, servingsPerPerson: d.servingsPerPerson }));
  const qtyAt = (heads: number) =>
    buildShoppingList(plans, heads).find((l) => l.itemId === itemId)?.buyQty;
  const low = qtyAt(headcount.low);
  const high = qtyAt(headcount.high);
  if (low === undefined || high === undefined || low === high) return null;
  return `range ${low}–${high} ${pluralize(buyUnit)}`;
}
