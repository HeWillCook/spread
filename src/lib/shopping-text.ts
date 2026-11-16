import { groupByAisle } from "@/domain/aisles";
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

// Small fractions people read at a glance. Anything else falls back to two decimals.
const FRACTIONS: [number, string][] = [
  [2 / 3, "2/3"],
  [1 / 3, "1/3"],
  [3 / 4, "3/4"],
  [1 / 4, "1/4"],
  [1 / 2, "1/2"],
];

/**
 * A number for the shopping list: "18", "1 1/2", "1/3", "0.17".
 * Whole numbers and the common kitchen fractions stay exact; everything else is
 * rounded to at most two decimals so raw floats like 0.1667 never surface.
 */
export function formatQty(qty: number): string {
  if (!Number.isFinite(qty) || qty <= 0) return "0";
  const whole = Math.floor(qty + 1e-9);
  const rest = qty - whole;
  if (rest < 0.01) return String(whole);
  if (rest > 0.99) return String(whole + 1);
  for (const [value, label] of FRACTIONS) {
    if (Math.abs(rest - value) <= 0.01) {
      return whole > 0 ? `${whole} ${label}` : label;
    }
  }
  return String(Math.round(qty * 100) / 100);
}

/** "1 1/2 lb", "0.17 onion", "18 buns" — quantity plus a correctly pluralised unit. */
export function formatNeededQty(qty: number, unit: string): string {
  const label = formatQty(qty);
  return `${label} ${label === "1" ? unit : pluralize(unit)}`;
}

/**
 * The recipe-unit need under a row's buy quantity: "18 buns (packs of 8)".
 * The pack note is left out when you buy the recipe unit itself (lb, each).
 */
export function formatNeed(
  needed: number,
  neededUnit: string,
  buyUnit: string,
  unitsPerBuy: number,
): string {
  const base = formatNeededQty(needed, neededUnit);
  const sameUnit = neededUnit.trim().toLowerCase() === buyUnit.trim().toLowerCase();
  if (unitsPerBuy <= 1 || sameUnit) return base;
  return `${base} (${pluralize(buyUnit)} of ${formatQty(unitsPerBuy)})`;
}

/** "12 confirmed + ~3 from maybes · range 12–17"; clauses that add nothing are left out. */
export function headcountLine(headcount: Headcount): string {
  const fromMaybes = headcount.planFor - headcount.confirmed;
  let text = `${headcount.confirmed} confirmed`;
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
    buildShoppingList(plans, heads).find(
      (l) => l.itemId === itemId || l.itemIds.includes(itemId),
    )?.buyQty;
  const low = qtyAt(headcount.low);
  const high = qtyAt(headcount.high);
  if (low === undefined || high === undefined || low === high) return null;
  return `range ${low}–${high} ${pluralize(buyUnit)}`;
}

/** The parts of a plan line the copied list needs. */
export interface CopyListLine {
  name: string;
  buyQty: number;
  buyUnit: string;
  checked: boolean;
  dishNames: string[];
}

/** "3" for countable things, "3 packs" otherwise. */
function copyQty(line: CopyListLine): string {
  return line.buyUnit === "each" ? formatQty(line.buyQty) : formatBuyQty(line.buyQty, line.buyUnit);
}

/**
 * Plain text for the clipboard, grouped by aisle, unchecked items first:
 *
 *   PRODUCE
 *   - [ ] Onion: 3 (for Burgers, Hot dogs)
 *   - [x] Lime: 4
 *
 * The "for ..." note only appears when a line merged dishes; a single-dish line
 * needs no explanation.
 */
export function shoppingListText(lines: CopyListLine[]): string {
  if (lines.length === 0) return "";
  const blocks: string[] = [];
  for (const group of groupByAisle(lines)) {
    const sorted = [...group.lines].sort((a, b) => {
      if (a.checked !== b.checked) return a.checked ? 1 : -1;
      return a.name.localeCompare(b.name, "en", { sensitivity: "base" });
    });
    const rows = sorted.map((line) => {
      const mark = line.checked ? "[x]" : "[ ]";
      const forDishes =
        line.dishNames.length > 1 ? ` (for ${line.dishNames.join(", ")})` : "";
      return `- ${mark} ${line.name}: ${copyQty(line)}${forDishes}`;
    });
    blocks.push([group.aisle.toUpperCase(), ...rows].join("\n"));
  }
  return blocks.join("\n\n");
}
