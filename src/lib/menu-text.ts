import type { Recipe } from "@/domain/recipes";

/** An amount for an input box: at most 3 decimals, no trailing zeros (1/6 -> "0.167", 1.5 -> "1.5"). */
export function formatAmount(value: number): string {
  if (!Number.isFinite(value)) return "";
  return String(Number(value.toFixed(3)));
}

/** Strict number from a form field. Blank or junk becomes NaN so the service rejects it. */
export function parseNumber(raw: FormDataEntryValue | null): number {
  if (typeof raw !== "string") return Number.NaN;
  const text = raw.trim();
  return text === "" ? Number.NaN : Number(text);
}

/** "Burgers" -> "burger", "Hummus" -> "hummus"; names that aren't a plural become "serving". */
export function servingWord(recipeName: string): string {
  const name = recipeName.trim().toLowerCase();
  if (name.length <= 3 || !name.endsWith("s")) return "serving";
  // "glass", "hummus" and "basis" are already singular, so never strip their "s".
  if (/(ss|us|is)$/.test(name)) return name;
  if (name.endsWith("ies")) return `${name.slice(0, -3)}y`;
  return name.slice(0, -1);
}

/** Lowercase a dish name for a unit phrase, but keep acronyms like "BBQ" intact. */
export function lowercaseDishName(recipeName: string): string {
  return recipeName
    .trim()
    .split(/\s+/)
    .map((word) => (/^(?=.*[A-Z]{2})[A-Z0-9&.'-]+$/.test(word) ? word : word.toLowerCase()))
    .join(" ");
}

/** Label for the appetite input: "burgers per person", "servings of potato salad per person". */
export function appetiteLabel(recipeName: string): string {
  const name = lowercaseDishName(recipeName);
  if (servingWord(recipeName) !== "serving") return `${name} per person`;
  return `servings of ${name} per person`;
}

/**
 * A row subtitle with its amount: "1.5 burgers per person". When the unit word is
 * just the generic "serving", the dish name above already says which dish it is, so
 * the row says only "1.5 servings per person".
 */
export function appetiteRowText(amount: number, recipeName: string): string {
  const unit =
    servingWord(recipeName) === "serving"
      ? amount === 1
        ? "serving"
        : "servings"
      : lowercaseDishName(recipeName);
  return `${formatAmount(amount)} ${unit} per person`;
}

/** "lb per burger" - what the amount input for an item means. */
export function amountLabel(unit: string, recipeName: string): string {
  return `${unit} per ${servingWord(recipeName)}`;
}

// Units that read the same for one or many ("8 lb", "4 each").
const INVARIANT_UNITS = new Set([
  "lb",
  "lbs",
  "oz",
  "g",
  "kg",
  "ml",
  "l",
  "gal",
  "each",
  "dozen",
  "tbsp",
  "tsp",
]);
// Common ingredients whose plural is not just "+s".
const IRREGULAR_PLURALS: Record<string, string> = {
  tomato: "tomatoes",
  potato: "potatoes",
};

/** "bun" -> "buns", "tomato" -> "tomatoes", "lb" -> "lb". */
export function pluralizeUnit(unit: string): string {
  const trimmed = unit.trim();
  const lower = trimmed.toLowerCase();
  if (!lower) return trimmed;
  const irregular = IRREGULAR_PLURALS[lower];
  if (irregular) return irregular;
  if (INVARIANT_UNITS.has(lower) || lower.endsWith("s")) return trimmed;
  if (/(x|z|ch|sh)$/.test(lower)) return `${trimmed}es`;
  if (/[^aeiou]y$/.test(lower)) return `${trimmed.slice(0, -1)}ies`;
  return `${trimmed}s`;
}

// Fractions a cook reads at a glance. Anything within a hundredth snaps to one.
const NICE_FRACTIONS: { value: number; label: string }[] = [
  { value: 1 / 4, label: "1/4" },
  { value: 1 / 3, label: "1/3" },
  { value: 1 / 2, label: "1/2" },
  { value: 2 / 3, label: "2/3" },
  { value: 3 / 4, label: "3/4" },
];

/**
 * A readable quantity: "1/2", "1 1/3", "2.25", "8". Snaps to a familiar fraction
 * within 0.01 and otherwise keeps at most 2 decimals (never 0.1667).
 */
export function formatQuantity(value: number): string {
  if (!Number.isFinite(value) || value < 0) return "";
  const rounded = Math.round(value * 100) / 100;
  const whole = Math.floor(rounded + 1e-9);
  const remainder = rounded - whole;
  if (Math.abs(remainder) < 0.01) return String(whole);
  for (const fraction of NICE_FRACTIONS) {
    if (Math.abs(remainder - fraction.value) < 0.01) {
      return whole > 0 ? `${whole} ${fraction.label}` : fraction.label;
    }
  }
  return String(Number(rounded.toFixed(2)));
}

/** "1 1/3 onions", "1/2 lemon", "1.5 lb": a quantity with the right singular or plural unit. */
export function formatIngredientAmount(value: number, unit: string): string {
  const amount = formatQuantity(value);
  if (!amount) return "";
  // One or less stays singular ("1/2 lemon"); zero reads as plural ("0 onions").
  const name = value > 1.0001 || value === 0 ? pluralizeUnit(unit) : unit;
  return `${amount} ${name}`;
}

/** How one ingredient is sold: "Sold individually, $1.00", "Sold in packs of 8 buns, $3.50". */
export function buyHint(
  item: { buyUnit: string; unitsPerBuy: number; unit: string; priceCents: number },
  price: string,
): string {
  const buyUnit = item.buyUnit.trim().toLowerCase();
  if (buyUnit === "each" || (buyUnit === "unit" && item.unitsPerBuy === 1)) {
    return `Sold individually, ${price}`;
  }
  if (item.unitsPerBuy > 1) {
    return `Sold in ${pluralizeUnit(item.buyUnit)} of ${formatQuantity(
      item.unitsPerBuy,
    )} ${pluralizeUnit(item.unit)}, ${price}`;
  }
  return `Sold by the ${item.buyUnit}, ${price}`;
}

/** Whole minutes for a dish when any time is known, else null. */
export function totalMinutes(recipe: Pick<Recipe, "prepMinutes" | "cookMinutes">): number | null {
  const total = (recipe.prepMinutes ?? 0) + (recipe.cookMinutes ?? 0);
  return total > 0 ? total : null;
}

/** "35 min", "1 hr", "1 hr 20 min": a cook-friendly duration. */
export function formatDuration(minutes: number): string {
  const total = Math.max(0, Math.round(minutes));
  const hours = Math.floor(total / 60);
  const rest = total % 60;
  if (hours === 0) return `${rest} min`;
  if (rest === 0) return `${hours} hr`;
  return `${hours} hr ${rest} min`;
}

/** "35 min" for a result row; null when the dish has no time estimates. */
export function totalTimeLabel(recipe: Pick<Recipe, "prepMinutes" | "cookMinutes">): string | null {
  const total = totalMinutes(recipe);
  return total === null ? null : formatDuration(total);
}

/** "Prep 15 min · Cook 1 hr 20 min · Total 1 hr 35 min", leaving out anything unknown. */
export function timeRow(recipe: Pick<Recipe, "prepMinutes" | "cookMinutes">): string | null {
  const parts: string[] = [];
  if (recipe.prepMinutes) parts.push(`Prep ${formatDuration(recipe.prepMinutes)}`);
  if (recipe.cookMinutes) parts.push(`Cook ${formatDuration(recipe.cookMinutes)}`);
  if (recipe.prepMinutes && recipe.cookMinutes) {
    parts.push(`Total ${formatDuration(recipe.prepMinutes + recipe.cookMinutes)}`);
  }
  return parts.length > 0 ? parts.join(" · ") : null;
}
