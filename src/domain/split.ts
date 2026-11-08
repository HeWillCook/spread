export interface SplitGuest {
  id: string;
  name: string;
  heads: number;
  excluded: boolean;
}

export interface SplitShare {
  guestId: string;
  name: string;
  owedCents: number;
}

export interface SplitResult {
  shares: SplitShare[];
  hostCoveredCents: number;
  chargedCents: number;
  unassignedCents: number;
}

/**
 * Split a bill across guests by head count. The shares always sum to the charged
 * amount exactly (largest-remainder distribution, ties broken by input order).
 * Excluded guests owe 0 and their heads are not counted.
 */
export function computeSplit(
  totalCents: number,
  guests: SplitGuest[],
  hostCoverCents: number,
): SplitResult {
  const total = Math.max(0, Math.round(totalCents));
  const hostCoveredCents = Math.min(total, Math.max(0, Math.round(hostCoverCents)));
  const chargedCents = total - hostCoveredCents;

  const weights = guests.map((g) => (g.excluded ? 0 : Math.max(0, Math.floor(g.heads))));
  const totalHeads = weights.reduce((a, b) => a + b, 0);

  if (totalHeads === 0) {
    return {
      shares: guests.map((g) => ({ guestId: g.id, name: g.name, owedCents: 0 })),
      hostCoveredCents,
      chargedCents,
      unassignedCents: chargedCents,
    };
  }

  const owed = weights.map((w) => Math.floor((chargedCents * w) / totalHeads));
  const remainders = weights.map((w) => (chargedCents * w) % totalHeads);
  let leftover = chargedCents - owed.reduce((a, b) => a + b, 0);

  const order = weights
    .map((_, i) => i)
    .filter((i) => weights[i] > 0)
    .sort((a, b) => remainders[b] - remainders[a] || a - b);
  for (const i of order) {
    if (leftover <= 0) break;
    owed[i] += 1;
    leftover -= 1;
  }

  return {
    shares: guests.map((g, i) => ({ guestId: g.id, name: g.name, owedCents: owed[i] })),
    hostCoveredCents,
    chargedCents,
    unassignedCents: 0,
  };
}
