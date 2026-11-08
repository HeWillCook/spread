import { describe, expect, it } from 'vitest';
import { formatCents, parseDollarsToCents } from './money';
import { computeSplit, type SplitGuest } from './split';
import { venmoPayLink } from './venmo';

const guest = (id: string, heads = 1, excluded = false): SplitGuest => ({
  id,
  name: `Guest ${id}`,
  heads,
  excluded,
});

const guests = (n: number): SplitGuest[] => Array.from({ length: n }, (_, i) => guest(String(i)));

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

describe('formatCents', () => {
  it('formats cents as dollars', () => {
    expect(formatCents(7550)).toBe('$75.50');
    expect(formatCents(0)).toBe('$0.00');
    expect(formatCents(5)).toBe('$0.05');
    expect(formatCents(504)).toBe('$5.04');
  });
});

describe('parseDollarsToCents', () => {
  it('parses valid dollar amounts', () => {
    expect(parseDollarsToCents('$5')).toBe(500);
    expect(parseDollarsToCents('5.04')).toBe(504);
    expect(parseDollarsToCents('  12.5 ')).toBe(1250);
    expect(parseDollarsToCents('0')).toBe(0);
  });

  it('returns null for invalid input', () => {
    expect(parseDollarsToCents('abc')).toBeNull();
    expect(parseDollarsToCents('-3')).toBeNull();
    expect(parseDollarsToCents('1.999')).toBeNull();
    expect(parseDollarsToCents('')).toBeNull();
  });
});

describe('computeSplit', () => {
  it('splits 7550 over 15 guests with largest remainder, ties by input order', () => {
    const r = computeSplit(7550, guests(15), 0);
    const owed = r.shares.map((s) => s.owedCents);
    expect(sum(owed)).toBe(7550);
    expect(Math.max(...owed) - Math.min(...owed)).toBeLessThanOrEqual(1);
    expect(owed.filter((c) => c === 504)).toHaveLength(5);
    expect(owed.filter((c) => c === 503)).toHaveLength(10);
    expect(owed.slice(0, 5)).toEqual([504, 504, 504, 504, 504]);
    expect(r.unassignedCents).toBe(0);
  });

  it('weights by heads', () => {
    const r = computeSplit(1000, [guest('a', 3), guest('b', 1), guest('c', 1)], 0);
    expect(r.shares.map((s) => s.owedCents)).toEqual([600, 200, 200]);
  });

  it('excluded guests owe 0 and others share the full charge', () => {
    const r = computeSplit(1000, [guest('a'), guest('b', 1, true), guest('c')], 0);
    expect(r.shares.map((s) => s.owedCents)).toEqual([500, 0, 500]);
    expect(r.shares[1].guestId).toBe('b');
  });

  it('applies the host cover', () => {
    const r = computeSplit(7550, guests(15), 2000);
    expect(r.hostCoveredCents).toBe(2000);
    expect(r.chargedCents).toBe(5550);
    expect(sum(r.shares.map((s) => s.owedCents))).toBe(5550);
  });

  it('clamps an oversized host cover to the total', () => {
    const r = computeSplit(7550, guests(3), 99999);
    expect(r.hostCoveredCents).toBe(7550);
    expect(r.chargedCents).toBe(0);
    expect(r.shares.every((s) => s.owedCents === 0)).toBe(true);
  });

  it('treats negative host cover as 0', () => {
    const r = computeSplit(7550, guests(3), -500);
    expect(r.hostCoveredCents).toBe(0);
    expect(r.chargedCents).toBe(7550);
    expect(sum(r.shares.map((s) => s.owedCents))).toBe(7550);
  });

  it('leaves the charge unassigned when there are no guests', () => {
    const r = computeSplit(7550, [], 2000);
    expect(r.shares).toEqual([]);
    expect(r.chargedCents).toBe(5550);
    expect(r.unassignedCents).toBe(5550);
  });

  it('leaves the charge unassigned when all guests are excluded', () => {
    const r = computeSplit(7550, [guest('a', 1, true), guest('b', 2, true)], 0);
    expect(r.shares.map((s) => s.owedCents)).toEqual([0, 0]);
    expect(r.unassignedCents).toBe(r.chargedCents);
    expect(r.unassignedCents).toBe(7550);
  });
});

describe('venmoPayLink', () => {
  it('builds a prefilled private pay link', () => {
    expect(
      venmoPayLink({ username: '@WillCook', amountCents: 504, note: 'Burger Night: your share' }),
    ).toBe(
      'https://venmo.com/WillCook?txn=pay&audience=private&amount=5.04&note=Burger%20Night%3A%20your%20share',
    );
  });

  it('works without a leading @', () => {
    expect(venmoPayLink({ username: 'WillCook', amountCents: 500, note: 'x' })).toBe(
      'https://venmo.com/WillCook?txn=pay&audience=private&amount=5.00&note=x',
    );
  });
});
