import type { Headcount } from "@/domain/headcount";
import { buildShoppingList } from "@/domain/shopping";
import type { MenuDish } from "@/services/menu";

/** How far above the largest saved count the sandbox lets a host look. */
const CUSTOM_HEADROOM = 25;

export type AttendancePresetId = "confirmed" | "plan" | "all";

export interface AttendancePreset {
  id: AttendancePresetId;
  label: string;
  heads: number;
  hint: string;
}

export interface DishYield {
  recipeId: string;
  name: string;
  emoji: string;
  servings: number;
  baselineServings: number;
}

export interface PreviewLine {
  recipeId: string;
  itemId: string;
  name: string;
  emoji: string;
  buyQty: number;
  buyUnit: string;
  estCostCents: number;
  baselineBuyQty: number;
  baselineCostCents: number;
  buyQtyDelta: number;
  costDeltaCents: number;
}

export interface AttendancePreview {
  heads: number;
  baselineHeads: number;
  dishes: DishYield[];
  lines: PreviewLine[];
  estCostCents: number;
  baselineEstCostCents: number;
  costDeltaCents: number;
  matchesSavedPlan: boolean;
}

/** A whole, non-negative number of people, even when the source is unusable. */
function wholeHeads(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.floor(value));
}

/** Dish servings round up exactly like the saved shopping list. */
export function preparedServings(heads: number, servingsPerPerson: number): number {
  const safeHeads = wholeHeads(heads);
  const safeServings = Number.isFinite(servingsPerPerson)
    ? Math.max(0, servingsPerPerson)
    : 0;
  const raw = safeHeads * safeServings;
  if (!Number.isFinite(raw)) return 0;
  // Mirrors buildShoppingList's epsilon so float noise does not add a serving.
  return Math.max(0, Math.ceil(raw - 1e-9));
}

/** Confirmed, the saved planning count, and everyone who might still come. */
export function attendancePresets(headcount: Headcount): AttendancePreset[] {
  return [
    {
      id: "confirmed",
      label: "Confirmed",
      heads: wholeHeads(headcount.confirmed),
      hint: "Everyone who said yes, with their plus-ones.",
    },
    {
      id: "plan",
      label: "Current plan",
      heads: wholeHeads(headcount.planFor),
      hint: "Your saved planning count for portions and shopping.",
    },
    {
      id: "all",
      label: "All maybes",
      heads: wholeHeads(headcount.high),
      hint: "Everyone confirmed plus every maybe, with plus-ones.",
    },
  ];
}

/**
 * A bounded exploration, always above the biggest saved count. A small empty
 * event still gets room to imagine a crowd; a large event is never capped lower
 * than the people already recorded.
 */
export function customHeadcountLimit(headcount: Headcount): number {
  const highest = Math.max(
    0,
    wholeHeads(headcount.confirmed),
    wholeHeads(headcount.planFor),
    wholeHeads(headcount.high),
  );
  return Math.max(25, highest + CUSTOM_HEADROOM);
}

export interface CustomHeadcountResult {
  heads: number | null;
  error: string | null;
}

/** Strict, whole-person input. Bad transient text never reaches the preview. */
export function parseCustomHeadcount(
  raw: string,
  headcount: Headcount,
): CustomHeadcountResult {
  const text = raw.trim();
  if (text === "") {
    return { heads: null, error: "Enter a whole number of people." };
  }
  if (!/^\d+$/.test(text)) {
    return { heads: null, error: "Use a whole number of people." };
  }
  const heads = Number(text);
  const limit = customHeadcountLimit(headcount);
  if (!Number.isSafeInteger(heads) || heads > limit) {
    return { heads: null, error: `Choose ${limit} people or fewer.` };
  }
  return { heads, error: null };
}

function keyOf(line: { recipeId: string; itemId: string }): string {
  return `${line.recipeId}::${line.itemId}`;
}

/**
 * Read-only comparison of one possible headcount with the saved plan. Costs use
 * the saved ingredient prices only; actual spend, extras and payments never
 * enter this calculation.
 */
export function buildAttendancePreview(
  dishes: MenuDish[],
  headcount: Headcount,
  heads: number,
): AttendancePreview {
  const shownHeads = wholeHeads(heads);
  const baselineHeads = wholeHeads(headcount.planFor);
  const plans = dishes.map((dish) => ({
    recipe: dish.recipe,
    servingsPerPerson: dish.servingsPerPerson,
  }));
  const baselineLines = buildShoppingList(plans, baselineHeads);
  const previewLines = buildShoppingList(plans, shownHeads);
  const baselineByKey = new Map(baselineLines.map((line) => [keyOf(line), line]));

  const lines: PreviewLine[] = previewLines.map((line) => {
    const baseline = baselineByKey.get(keyOf(line));
    const baselineBuyQty = baseline?.buyQty ?? 0;
    const baselineCostCents = baseline?.estCostCents ?? 0;
    return {
      recipeId: line.recipeId,
      itemId: line.itemId,
      name: line.name,
      emoji: line.emoji,
      buyQty: line.buyQty,
      buyUnit: line.buyUnit,
      estCostCents: line.estCostCents,
      baselineBuyQty,
      baselineCostCents,
      buyQtyDelta: line.buyQty - baselineBuyQty,
      costDeltaCents: line.estCostCents - baselineCostCents,
    };
  });

  const estCostCents = lines.reduce((sum, line) => sum + line.estCostCents, 0);
  const baselineEstCostCents = baselineLines.reduce(
    (sum, line) => sum + line.estCostCents,
    0,
  );

  return {
    heads: shownHeads,
    baselineHeads,
    dishes: dishes.map((dish) => ({
      recipeId: dish.recipe.id,
      name: dish.recipe.name,
      emoji: dish.recipe.emoji,
      servings: preparedServings(shownHeads, dish.servingsPerPerson),
      baselineServings: preparedServings(baselineHeads, dish.servingsPerPerson),
    })),
    lines,
    estCostCents,
    baselineEstCostCents,
    costDeltaCents: estCostCents - baselineEstCostCents,
    matchesSavedPlan: shownHeads === baselineHeads,
  };
}
