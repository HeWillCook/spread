/** Ids of guests whose trimmed, lower-cased name matches another guest's (likely a double RSVP). */
export function duplicateGuestIds(guests: { id: string; name: string }[]): Set<string> {
  const key = (name: string) => name.trim().toLowerCase();
  const seen = new Map<string, number>();
  for (const g of guests) seen.set(key(g.name), (seen.get(key(g.name)) ?? 0) + 1);
  return new Set(guests.filter((g) => (seen.get(key(g.name)) ?? 0) > 1).map((g) => g.id));
}
