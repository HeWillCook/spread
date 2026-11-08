/** Prefilled Venmo pay link (there is no Venmo API; this only opens the app/site prefilled). */
export function venmoPayLink(o: { username: string; amountCents: number; note: string }): string {
  const username = o.username.trim().replace(/^@/, '');
  const cents = Math.max(0, Math.round(o.amountCents));
  const amount = `${Math.floor(cents / 100)}.${String(cents % 100).padStart(2, '0')}`;
  return `https://venmo.com/${encodeURIComponent(username)}?txn=pay&audience=private&amount=${amount}&note=${encodeURIComponent(o.note)}`;
}
