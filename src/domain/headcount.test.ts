import { describe, expect, it } from 'vitest';
import { computeHeadcount, type HeadcountGuest } from './headcount';

const many = (n: number, status: HeadcountGuest['status'], plusOnes = 0): HeadcountGuest[] =>
  Array.from({ length: n }, () => ({ status, plusOnes }));

describe('computeHeadcount', () => {
  it('computes the basic 12 yes + 5 maybe case', () => {
    expect(computeHeadcount([...many(12, 'yes'), ...many(5, 'maybe')])).toEqual({
      confirmed: 12,
      maybeHeads: 5,
      expectedFromMaybes: 2.5,
      planFor: 15,
      low: 12,
      high: 17,
    });
  });

  it('counts plus-ones for yes and maybe guests', () => {
    const result = computeHeadcount([
      { status: 'yes', plusOnes: 2 },
      { status: 'maybe', plusOnes: 1 },
    ]);
    expect(result.confirmed).toBe(3);
    expect(result.maybeHeads).toBe(2);
  });

  it('ignores plus-ones of declined guests', () => {
    const result = computeHeadcount([{ status: 'no', plusOnes: 4 }]);
    expect(result.confirmed).toBe(0);
    expect(result.maybeHeads).toBe(0);
    expect(result.high).toBe(0);
  });

  it('returns all zeros for an empty list', () => {
    expect(computeHeadcount([])).toEqual({
      confirmed: 0,
      maybeHeads: 0,
      expectedFromMaybes: 0,
      planFor: 0,
      low: 0,
      high: 0,
    });
  });

  it('plans for confirmed only at fraction 0', () => {
    const result = computeHeadcount([...many(4, 'yes'), ...many(5, 'maybe')], 0);
    expect(result.planFor).toBe(result.confirmed);
  });

  it('plans for the high number at fraction 1', () => {
    const result = computeHeadcount([...many(4, 'yes'), ...many(5, 'maybe')], 1);
    expect(result.planFor).toBe(result.high);
  });

  it('clamps fractions above 1 to 1', () => {
    const result = computeHeadcount(many(5, 'maybe'), 1.5);
    expect(result.planFor).toBe(result.high);
  });

  it('clamps negative fractions to 0', () => {
    const result = computeHeadcount([...many(2, 'yes'), ...many(5, 'maybe')], -1);
    expect(result.planFor).toBe(result.confirmed);
  });

  it('is not thrown off by floating point noise', () => {
    const result = computeHeadcount(many(100, 'maybe'), 0.07);
    expect(result.planFor).toBe(7);
  });
});
