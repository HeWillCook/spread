import { describe, expect, it } from 'vitest';
import { STARTER_RECIPES, type Recipe } from './recipes';
import { buildShoppingList, totalCents, type DishPlan } from './shopping';

const burgers = STARTER_RECIPES.find((r) => r.id === 'starter-burgers') as Recipe;

function buyQtyOf(lines: ReturnType<typeof buildShoppingList>, itemId: string) {
  const line = lines.find((l) => l.itemId === itemId);
  if (!line) throw new Error(`no line for ${itemId}`);
  return line.buyQty;
}

describe('buildShoppingList', () => {
  it('computes burger quantities and total for 15 people at 1.5 each', () => {
    const lines = buildShoppingList([{ recipe: burgers, servingsPerPerson: 1.5 }], 15);
    expect(lines.every((l) => l.servings === 23)).toBe(true);
    expect(buyQtyOf(lines, 'starter-burgers-beef')).toBe(8);
    expect(buyQtyOf(lines, 'starter-burgers-buns')).toBe(3);
    expect(buyQtyOf(lines, 'starter-burgers-cheese')).toBe(1);
    expect(buyQtyOf(lines, 'starter-burgers-onion')).toBe(4);
    expect(buyQtyOf(lines, 'starter-burgers-jalapeno')).toBe(6);
    expect(totalCents(lines, {}, [])).toBe(7550);
  });

  it('rounds beef up to 12 lb when perServing is 0.5', () => {
    const recipe: Recipe = {
      ...burgers,
      items: burgers.items.map((i) =>
        i.id === 'starter-burgers-beef' ? { ...i, perServing: 0.5 } : i,
      ),
    };
    const lines = buildShoppingList([{ recipe, servingsPerPerson: 1.5 }], 15);
    expect(buyQtyOf(lines, 'starter-burgers-beef')).toBe(12);
  });

  it('buys nothing when headcount is 0', () => {
    const lines = buildShoppingList([{ recipe: burgers, servingsPerPerson: 1.5 }], 0);
    expect(lines.length).toBe(burgers.items.length);
    for (const l of lines) {
      expect(l.buyQty).toBe(0);
      expect(l.estCostCents).toBe(0);
    }
  });

  it('buys nothing when servingsPerPerson is 0', () => {
    const lines = buildShoppingList([{ recipe: burgers, servingsPerPerson: 0 }], 15);
    for (const l of lines) {
      expect(l.buyQty).toBe(0);
      expect(l.estCostCents).toBe(0);
    }
  });

  it('does not over-buy because of float noise', () => {
    const recipe: Recipe = {
      id: 'r',
      name: 'R',
      emoji: 'x',
      defaultServingsPerPerson: 1,
      items: [
        {
          id: 'i',
          name: 'I',
          emoji: 'x',
          perServing: 0.1,
          unit: 'u',
          buyUnit: 'bag',
          unitsPerBuy: 0.3,
          priceCents: 100,
        },
      ],
    };
    const dishes: DishPlan[] = [{ recipe, servingsPerPerson: 3 }];
    const lines = buildShoppingList(dishes, 1);
    expect(lines[0].servings).toBe(3);
    expect(lines[0].buyQty).toBe(1);
  });
});

describe('totalCents', () => {
  it('uses actual overrides and adds extras', () => {
    const lines = buildShoppingList([{ recipe: burgers, servingsPerPerson: 1.5 }], 15);
    expect(totalCents(lines, { 'starter-burgers-beef': 6000 }, [1250])).toBe(9600);
  });
});
