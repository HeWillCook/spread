/** Format integer cents as a dollar string, e.g. 7550 -> "$75.50". */
export function formatCents(cents: number): string {
  const rounded = Math.round(cents);
  const abs = Math.abs(rounded);
  const dollars = Math.floor(abs / 100);
  const rem = String(abs % 100).padStart(2, '0');
  return `${rounded < 0 ? '-' : ''}$${dollars}.${rem}`;
}

/**
 * Parse user-entered dollars into integer cents. Accepts an optional leading "$"
 * and up to two decimal places. Returns null for anything else (negatives, junk,
 * sub-cent precision).
 */
export function parseDollarsToCents(input: string): number | null {
  const match = /^\$?(\d+)?(?:\.(\d{1,2}))?$/.exec(input.trim());
  if (!match) return null;
  const [, whole, frac] = match;
  if (whole === undefined && frac === undefined) return null;
  return Number(whole ?? '0') * 100 + Number((frac ?? '').padEnd(2, '0'));
}
