/** Deterministic pseudo-random values for decorative scraps: same seed, same page. */
export function seeded(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

export function between(rand: () => number, min: number, max: number): number {
  return min + rand() * (max - min);
}

export function round(value: number, places = 2): number {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
}
