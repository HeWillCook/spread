/** An amount for an input box: at most 4 decimals, no trailing zeros (1/3 -> "0.3333", 1.5 -> "1.5"). */
export function formatAmount(value: number): string {
  if (!Number.isFinite(value)) return "";
  return String(Number(value.toFixed(4)));
}

/** Strict number from a form field. Blank or junk becomes NaN so the service rejects it. */
export function parseNumber(raw: FormDataEntryValue | null): number {
  if (typeof raw !== "string") return Number.NaN;
  const text = raw.trim();
  return text === "" ? Number.NaN : Number(text);
}

/** "Burgers" -> "burger"; names that don't end in a plural "s" become "serving". */
export function servingWord(recipeName: string): string {
  const name = recipeName.trim().toLowerCase();
  if (name.length > 3 && name.endsWith("s") && !name.endsWith("ss")) return name.slice(0, -1);
  return "serving";
}

/** Label for the appetite input: "burgers per person", "servings of potato salad per person". */
export function appetiteLabel(recipeName: string): string {
  const name = recipeName.trim().toLowerCase();
  if (servingWord(recipeName) !== "serving") return `${name} per person`;
  return `servings of ${name} per person`;
}

/** "lb per burger" - what the amount input for an item means. */
export function amountLabel(unit: string, recipeName: string): string {
  return `${unit} per ${servingWord(recipeName)}`;
}
