/**
 * Fire is decorative, so it must look the same on every render. These helpers
 * replace Math.random with a fixed linear-congruential generator: same seed,
 * same embers, no hydration surprises.
 */

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
