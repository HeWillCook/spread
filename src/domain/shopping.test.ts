import { describe, expect, it } from 'vitest';
import { STARTER_RECIPES, type Recipe, type RecipeItem } from './recipes';
import { buildDishNeeds, buildShoppingList, totalCents, type DishPlan } from './shopping';

const burgers = STARTER_RECIPES.find((r) => r.id === 'starter-burgers') as Recipe;
const hotDogs = STARTER_RECIPES.find((r) => r.id === 'starter-hot-dogs') as Recipe;
const bratwurst = STARTER_RECIPES.find((r) => r.id === 'starter-bratwurst') as Recipe;
const veggieBurgers = STARTER_RECIPES.find((r) => r.id === 'starter-veggie-burgers') as Recipe;

function buyQtyOf(lines: ReturnType<typeof buildShoppingList>, itemId: string) {
  const line = lines.find((l) => l.itemIds.includes(itemId));
  if (!line) throw new Error(`no line for ${itemId}`);
  return line.buyQty;
}

function lineNamed(lines: ReturnType<typeof buildShoppingList>, name: string) {
  const line = lines.find((l) => l.name === name);
  if (!line) throw new Error(`no line named ${name}`);
  return line;
}

function item(overrides: Partial<RecipeItem> & Pick<RecipeItem, 'id' | 'name'>): RecipeItem {
  return {
    emoji: '🍽️',
    perServing: 1,
    unit: 'each',
    buyUnit: 'each',
    unitsPerBuy: 1,
    priceCents: 100,
    ...overrides,
  };
}

function recipeWith(id: string, name: string, items: RecipeItem[]): Recipe {
  return { id, name, emoji: '🍽️', defaultServingsPerPerson: 1, items };
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
    const recipe = recipeWith('r', 'R', [
      item({ id: 'i', name: 'I', perServing: 0.1, unit: 'u', buyUnit: 'bag', unitsPerBuy: 0.3 }),
    ]);
    const dishes: DishPlan[] = [{ recipe, servingsPerPerson: 3 }];
    const lines = buildShoppingList(dishes, 1);
    expect(lines[0].servings).toBe(3);
    expect(lines[0].buyQty).toBe(1);
  });
});

describe('buildDishNeeds', () => {
  it('keeps per-dish amounts for a shared ingredient', () => {
    const needs = buildDishNeeds(
      [
        { recipe: burgers, servingsPerPerson: 1 },
        { recipe: hotDogs, servingsPerPerson: 2 },
      ],
      4,
    );
    // 4 servings of burgers, 8 of hot dogs; the hot dogs must not inflate burgers.
    const burgerOnion = needs.find((n) => n.itemId === 'starter-burgers-onion')!;
    const hotDogOnion = needs.find((n) => n.itemId === 'starter-hot-dogs-onion')!;
    expect(burgerOnion).toMatchObject({ recipeId: 'starter-burgers', name: 'Onion', servings: 4 });
    expect(burgerOnion.needed).toBeCloseTo(4 / 6, 10);
    expect(hotDogOnion).toMatchObject({
      recipeId: 'starter-hot-dogs',
      name: 'Onion',
      servings: 8,
    });
    expect(hotDogOnion.needed).toBeCloseTo(8 / 8, 10);
  });

  it('returns one line per recipe item, in menu order, with no merging', () => {
    const dishes: DishPlan[] = [
      { recipe: burgers, servingsPerPerson: 1.5 },
      { recipe: hotDogs, servingsPerPerson: 1.5 },
    ];
    const needs = buildDishNeeds(dishes, 12);
    expect(needs).toHaveLength(burgers.items.length + hotDogs.items.length);
    expect(needs.filter((n) => n.name === 'Onion')).toHaveLength(2);
    expect(needs.every((n) => n.servings === 18)).toBe(true);
  });

  it('is the same math the merged list uses, summed per ingredient', () => {
    const dishes: DishPlan[] = [
      { recipe: burgers, servingsPerPerson: 1.5 },
      { recipe: hotDogs, servingsPerPerson: 1.5 },
      { recipe: bratwurst, servingsPerPerson: 1.5 },
    ];
    const needs = buildDishNeeds(dishes, 12);
    const merged = lineNamed(buildShoppingList(dishes, 12), 'Onion');
    const onions = needs.filter((n) => n.name === 'Onion');
    expect(onions).toHaveLength(3);
    expect(merged.needed).toBeCloseTo(
      onions.reduce((sum, n) => sum + n.needed, 0),
      10,
    );
    expect(merged.buyQty).toBe(9);
  });

  it('gives a zero-amount ingredient a zero need and nothing to buy', () => {
    const zeroed: Recipe = {
      ...burgers,
      items: burgers.items.map((i) =>
        i.id === 'starter-burgers-onion' ? { ...i, perServing: 0 } : i,
      ),
    };
    const needs = buildDishNeeds([{ recipe: zeroed, servingsPerPerson: 1.5 }], 12);
    const onion = needs.find((n) => n.itemId === 'starter-burgers-onion')!;
    expect(onion).toMatchObject({ needed: 0, buyQty: 0, estCostCents: 0 });
  });
});

describe('merging ingredients across dishes', () => {
  it('merges three onion items into one line with the summed need, rounded once', () => {
    const lines = buildShoppingList(
      [
        { recipe: burgers, servingsPerPerson: 1.5 },
        { recipe: hotDogs, servingsPerPerson: 1.5 },
        { recipe: bratwurst, servingsPerPerson: 1.5 },
      ],
      12,
    );
    const onion = lineNamed(lines, 'Onion');
    // 18 servings each: 3 + 2.25 + 3 = 8.25 onions -> 9 each.
    expect(onion.itemIds).toEqual([
      'starter-bratwurst-onion',
      'starter-burgers-onion',
      'starter-hot-dogs-onion',
    ]);
    expect(onion.itemId).toBe('starter-bratwurst-onion');
    expect(onion.sources.map((s) => s.recipeName)).toEqual(['Burgers', 'Hot dogs', 'Bratwurst']);
    expect(onion.needed).toBeCloseTo(8.25, 10);
    expect(onion.neededUnit).toBe('onion');
    expect(onion.buyQty).toBe(9);
    expect(onion.estCostCents).toBe(900);
    expect(lines.filter((l) => l.name === 'Onion')).toHaveLength(1);
  });

  it('buys fewer bun packs than one-per-dish rounding would', () => {
    const lines = buildShoppingList(
      [
        { recipe: burgers, servingsPerPerson: 1.5 },
        { recipe: veggieBurgers, servingsPerPerson: 1.5 },
      ],
      12,
    );
    const buns = lineNamed(lines, 'Burger buns');
    expect(buns.itemIds).toEqual(['starter-burgers-buns', 'starter-veggie-burgers-buns']);
    expect(buns.needed).toBe(36);
    // One rounding of 36 buns is 5 packs; rounding each dish first would buy 3 + 3.
    expect(buns.buyQty).toBe(5);
    expect(buns.estCostCents).toBe(5 * 350);
    expect(lines.filter((l) => l.name === 'Burger buns')).toHaveLength(1);
  });

  it('keeps same-named rows separate when their units or pack sizes differ', () => {
    const a = recipeWith('a', 'A', [
      item({ id: 'a-onion', name: 'Onion', unit: 'onion', buyUnit: 'each', unitsPerBuy: 1 }),
    ]);
    const b = recipeWith('b', 'B', [
      item({ id: 'b-onion', name: 'Onion', unit: 'lb', buyUnit: 'bag', unitsPerBuy: 3, priceCents: 250 }),
    ]);
    const lines = buildShoppingList(
      [
        { recipe: a, servingsPerPerson: 1 },
        { recipe: b, servingsPerPerson: 1 },
      ],
      4,
    );
    expect(lines).toHaveLength(2);
    expect(lines.map((l) => l.buyUnit)).toEqual(['each', 'bag']);
  });

  it('ignores case and extra spaces when merging', () => {
    const a = recipeWith('a', 'A', [item({ id: 'a', name: '  Red  Onion ' })]);
    const b = recipeWith('b', 'B', [item({ id: 'b', name: 'red onion' })]);
    const lines = buildShoppingList(
      [
        { recipe: a, servingsPerPerson: 1 },
        { recipe: b, servingsPerPerson: 1 },
      ],
      3,
    );
    expect(lines).toHaveLength(1);
    expect(lines[0].needed).toBe(6);
    expect(lines[0].name).toBe('Red Onion');
  });
});

describe('totalCents', () => {
  it('uses actual overrides and adds extras', () => {
    const lines = buildShoppingList([{ recipe: burgers, servingsPerPerson: 1.5 }], 15);
    expect(totalCents(lines, { 'starter-burgers-beef': 6000 }, [1250])).toBe(9600);
  });
});
