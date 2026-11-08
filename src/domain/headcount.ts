export type RsvpStatus = 'yes' | 'maybe' | 'no';

export interface HeadcountGuest {
  status: RsvpStatus;
  plusOnes: number;
}

export interface Headcount {
  /** Heads of 'yes' guests, including plus-ones. */
  confirmed: number;
  /** Heads of 'maybe' guests, including plus-ones. */
  maybeHeads: number;
  /** maybeHeads * fraction, unrounded. */
  expectedFromMaybes: number;
  /** ceil(confirmed + expectedFromMaybes) */
  planFor: number;
  /** Same as confirmed. */
  low: number;
  /** confirmed + maybeHeads */
  high: number;
}

const DEFAULT_MAYBE_FRACTION = 0.5;

export function computeHeadcount(
  guests: HeadcountGuest[],
  maybeFraction: number = DEFAULT_MAYBE_FRACTION,
): Headcount {
  const fraction = Number.isNaN(maybeFraction)
    ? DEFAULT_MAYBE_FRACTION
    : Math.min(1, Math.max(0, maybeFraction));

  let confirmed = 0;
  let maybeHeads = 0;
  for (const guest of guests) {
    const heads = 1 + guest.plusOnes;
    if (guest.status === 'yes') confirmed += heads;
    else if (guest.status === 'maybe') maybeHeads += heads;
  }

  const expectedFromMaybes = maybeHeads * fraction;
  // Round to 6 decimals first so float noise (e.g. 100 * 0.07 = 7.000000000000001) doesn't bump the ceil.
  const planFor = Math.ceil(Math.round((confirmed + expectedFromMaybes) * 1e6) / 1e6);

  return {
    confirmed,
    maybeHeads,
    expectedFromMaybes,
    planFor,
    low: confirmed,
    high: confirmed + maybeHeads,
  };
}
