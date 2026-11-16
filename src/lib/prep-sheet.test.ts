import { describe, expect, it } from "vitest";
import { computeHeadcount } from "@/domain/headcount";
import type { RecipeItem } from "@/domain/recipes";
import type { MenuDish } from "@/services/menu";
import { buildPrepSheet, planningLabel, prepSheetText } from "./prep-sheet";

function item(overrides: Partial<RecipeItem> & Pick<RecipeItem, "id" | "name">): RecipeItem {
  return {
    emoji: "🍽️",
    perServing: 1,
    unit: "each",
    buyUnit: "pack",
    unitsPerBuy: 1,
    priceCents: 100,
    ...overrides,
  };
}

const burgers: MenuDish = {
  dishId: "dish-burgers",
  servingsPerPerson: 1,
  isStarter: false,
  recipe: {
    id: "recipe-burgers",
    name: "Burgers",
    emoji: "🍔",
    defaultServingsPerPerson: 1,
    items: [
      item({
        id: "beef",
        name: "Ground beef",
        perServing: 0.5,
        unit: "lb",
        buyUnit: "pack",
        unitsPerBuy: 1,
        priceCents: 650,
      }),
      item({
        id: "buns",
        name: "Buns",
        perServing: 1,
        unit: "bun",
        buyUnit: "pack",
        unitsPerBuy: 8,
        priceCents: 350,
      }),
    ],
  },
};

const hotDogs: MenuDish = {
  dishId: "dish-hot-dogs",
  servingsPerPerson: 2,
  isStarter: false,
  recipe: {
    id: "recipe-hot-dogs",
    name: "Hot dogs",
    emoji: "🌭",
    defaultServingsPerPerson: 2,
    items: [
      item({
        id: "sausages",
        name: "Sausages",
        perServing: 1,
        unit: "sausage",
        buyUnit: "pack",
        unitsPerBuy: 8,
        priceCents: 420,
      }),
      item({
        id: "hot-dog-onion",
        name: "Onion",
        perServing: 0.125,
        unit: "onion",
        buyUnit: "each",
        unitsPerBuy: 1,
        priceCents: 100,
      }),
    ],
  },
};

const onionBurgers: MenuDish = {
  dishId: "dish-onion-burgers",
  servingsPerPerson: 1,
  isStarter: false,
  recipe: {
    id: "recipe-onion-burgers",
    name: "Burgers",
    emoji: "🍔",
    defaultServingsPerPerson: 1,
    items: [
      item({
        id: "burger-onion",
        name: "Onion",
        perServing: 0.5,
        unit: "onion",
        buyUnit: "each",
        unitsPerBuy: 1,
        priceCents: 100,
      }),
    ],
  },
};

const event = {
  id: "ev1",
  title: "Burger Night",
  startsAt: new Date("2026-11-14T19:00:00Z"),
  location: "Will's backyard",
  timezone: "UTC",
};

const yesGuests = (count: number) =>
  Array.from({ length: count }, () => ({ status: "yes" as const, plusOnes: 0 }));

describe("buildPrepSheet", () => {
  it("scales fractional ingredients by servings and rounds packs up", () => {
    const sheet = buildPrepSheet({
      event,
      dishes: [burgers],
      headcount: computeHeadcount(yesGuests(3), 0.5),
      guests: [],
    });

    expect(sheet.when).toBe("Sat, Nov 14 · 7pm · Will's backyard");
    expect(sheet.dishes).toHaveLength(1);
    expect(sheet.dishes[0].servings).toBe(3);
    expect(sheet.dishes[0].servingsLabel).toBe("3 burgers");
    expect(sheet.dishes[0].ingredients).toEqual([
      expect.objectContaining({ name: "Ground beef", needed: 1.5, neededLabel: "1 1/2 lb" }),
      expect.objectContaining({ name: "Buns", needed: 3, neededLabel: "3 buns" }),
    ]);
    expect(sheet.shopping).toEqual([
      expect.objectContaining({ name: "Ground beef", buyQty: 2, buyLabel: "2 packs" }),
      expect.objectContaining({ name: "Buns", buyQty: 1, buyLabel: "1 pack" }),
    ]);
  });

  it("writes kitchen amounts as fractions and keeps units singular at one or less", () => {
    const brunch: MenuDish = {
      dishId: "dish-brunch",
      servingsPerPerson: 1,
      isStarter: false,
      recipe: {
        id: "recipe-brunch",
        name: "Brunch",
        emoji: "🍳",
        defaultServingsPerPerson: 1,
        items: [
          item({
            id: "brunch-eggs",
            name: "Eggs",
            perServing: 1.75,
            unit: "egg",
            buyUnit: "dozen",
            unitsPerBuy: 12,
            priceCents: 400,
          }),
          item({
            id: "brunch-butter",
            name: "Butter",
            perServing: 10.5,
            unit: "tbsp",
            buyUnit: "stick",
            unitsPerBuy: 8,
            priceCents: 150,
          }),
          item({
            id: "brunch-lemon",
            name: "Lemon",
            perServing: 0.5,
            unit: "lemon",
            buyUnit: "each",
            unitsPerBuy: 1,
            priceCents: 60,
          }),
          item({
            id: "brunch-celery",
            name: "Celery",
            perServing: 1.75,
            unit: "stalk",
            buyUnit: "bunch",
            unitsPerBuy: 6,
            priceCents: 200,
          }),
        ],
      },
    };
    const sheet = buildPrepSheet({
      event,
      dishes: [brunch],
      headcount: computeHeadcount(yesGuests(1), 0.5),
      guests: [],
    });

    expect(sheet.dishes[0].ingredients).toEqual([
      expect.objectContaining({ name: "Eggs", neededLabel: "1 3/4 eggs" }),
      expect.objectContaining({ name: "Butter", neededLabel: "10 1/2 tbsp" }),
      expect.objectContaining({ name: "Lemon", neededLabel: "1/2 lemon" }),
      expect.objectContaining({ name: "Celery", neededLabel: "1 3/4 stalks" }),
    ]);
  });

  it("keeps each dish's own amount for a shared ingredient", () => {
    const headcount = computeHeadcount(yesGuests(4), 0.5);
    const onlyBurgers = buildPrepSheet({
      event,
      dishes: [onionBurgers],
      headcount,
      guests: [],
    });
    const onlyHotDogs = buildPrepSheet({
      event,
      dishes: [hotDogs],
      headcount,
      guests: [],
    });
    const sheet = buildPrepSheet({
      event,
      dishes: [onionBurgers, hotDogs],
      headcount,
      guests: [],
    });

    // 4 servings of burgers need 2 onions; 8 of hot dogs need 1.
    expect(onlyBurgers.dishes[0].servings).toBe(4);
    expect(onlyHotDogs.dishes[0].servings).toBe(8);
    expect(onlyBurgers.dishes[0].ingredients).toEqual([
      expect.objectContaining({ name: "Onion", needed: 2, neededLabel: "2 onions" }),
    ]);
    expect(onlyHotDogs.dishes[0].ingredients).toEqual([
      expect.objectContaining({ name: "Sausages", needed: 8 }),
      expect.objectContaining({ name: "Onion", needed: 1, neededLabel: "1 onion" }),
    ]);

    const burgerDish = sheet.dishes.find((dish) => dish.name === "Burgers")!;
    const hotDogDish = sheet.dishes.find((dish) => dish.name === "Hot dogs")!;
    expect(burgerDish.servings).toBe(4);
    expect(burgerDish.ingredients).toEqual(onlyBurgers.dishes[0].ingredients);
    expect(hotDogDish.servings).toBe(8);
    expect(hotDogDish.ingredients).toEqual(onlyHotDogs.dishes[0].ingredients);

    // The sheet's Shopping section is the merged list: one onion line, summed and rounded once.
    const onions = sheet.shopping.filter((item) => item.name === "Onion");
    expect(onions).toHaveLength(1);
    expect(onions[0]).toMatchObject({ needed: 3, neededLabel: "3 onions", buyQty: 3 });
    expect(prepSheetText(sheet)).toContain("Burgers — 4 burgers\n- Onion: 2 onions");
    expect(prepSheetText(sheet)).toContain("Hot dogs — 8 hot dogs\n- Sausages: 8 sausages\n- Onion: 1 onion");
    expect(prepSheetText(sheet)).toContain("Shopping\n[ ] Onion: 3 each\n[ ] Sausages: 1 pack");
  });

  it("carries the recipe's times and steps into the sheet and its text", () => {
    const withSteps: MenuDish = {
      ...burgers,
      recipe: {
        ...burgers.recipe,
        prepMinutes: 15,
        cookMinutes: 20,
        steps: ["Form the patties.", "Grill 4 minutes a side."],
      },
    };
    const sheet = buildPrepSheet({
      event,
      dishes: [withSteps],
      headcount: computeHeadcount(yesGuests(3), 0.5),
      guests: [],
    });

    expect(sheet.dishes[0].timeLabel).toBe("Prep 15 min · Cook 20 min · Total 35 min");
    expect(sheet.dishes[0].steps).toEqual(["Form the patties.", "Grill 4 minutes a side."]);
    const text = prepSheetText(sheet);
    expect(text).toContain("Prep 15 min · Cook 20 min · Total 35 min");
    expect(text).toContain("1. Form the patties.\n2. Grill 4 minutes a side.");
  });

  it("keeps dishes but leaves shopping empty when nobody is counted yet", () => {
    const sheet = buildPrepSheet({
      event,
      dishes: [burgers],
      headcount: computeHeadcount([], 0.5),
      guests: [],
    });

    expect(sheet.headcount.planFor).toBe(0);
    expect(sheet.dishes[0].servings).toBe(0);
    expect(sheet.dishes[0].ingredients[0].needed).toBe(0);
    expect(sheet.shopping).toEqual([]);
    expect(prepSheetText(sheet)).toContain("Nothing to buy yet");
  });

  it("explains an empty shopping list when saved portions are zero despite counted guests", () => {
    const sheet = buildPrepSheet({
      event, dishes: [{ ...burgers, servingsPerPerson: 0 }],
      headcount: computeHeadcount(yesGuests(3), 0.5), guests: [],
    });
    expect(sheet.headcount.planFor).toBe(3);
    expect(sheet.shopping).toEqual([]);
    expect(prepSheetText(sheet)).toContain("Nothing to buy for the saved portions.");
    expect(prepSheetText(sheet)).not.toContain("once guests are counted");
  });

  it("labels a zero-person plan accurately even when maybe guests have answered", () => {
    expect(planningLabel(computeHeadcount([{ status: "maybe", plusOnes: 1 }], 0))).toBe(
      "Planning for 0 people",
    );
  });

  it("handles an empty menu without inventing dishes", () => {
    const sheet = buildPrepSheet({
      event,
      dishes: [],
      headcount: computeHeadcount(yesGuests(3), 0.5),
      guests: [],
    });

    expect(sheet.hasMenu).toBe(false);
    expect(sheet.dishes).toEqual([]);
    expect(sheet.shopping).toEqual([]);
    const text = prepSheetText(sheet);
    expect(text).toContain("No dishes saved yet");
    expect(text).toContain("Menu");
  });

  it("keeps only yes/maybe food notes and trims them", () => {
    const guests = [
      { id: "g1", name: "Dana", status: "yes" as const, foodNotes: "  No dairy  " },
      { id: "g2", name: "Eli", status: "maybe" as const, foodNotes: "Shellfish" },
      { id: "g3", name: "Fran", status: "no" as const, foodNotes: "Gluten-free" },
      { id: "g4", name: "Gus", status: "yes" as const, foodNotes: "   " },
      { id: "g5", name: "Hal", status: "maybe" as const, foodNotes: null },
    ];

    const sheet = buildPrepSheet({
      event,
      dishes: [burgers],
      headcount: computeHeadcount(yesGuests(3), 0.5),
      guests,
    });

    expect(sheet.foodNotes).toEqual([
      { guestId: "g1", name: "Dana", status: "yes", notes: "No dairy" },
      { guestId: "g2", name: "Eli", status: "maybe", notes: "Shellfish" },
    ]);
  });

  it("builds a plain-text sheet with prep, rounded shopping, and host-only notes", () => {
    const sheet = buildPrepSheet({
      event,
      dishes: [burgers],
      headcount: computeHeadcount(yesGuests(3), 0.5),
      guests: [
        { id: "g1", name: "Dana", status: "yes" as const, foodNotes: "No dairy" },
        { id: "g2", name: "Eli", status: "no" as const, foodNotes: "Not coming" },
      ],
    });
    const text = prepSheetText(sheet);

    expect(text).toContain("Burger Night\nSat, Nov 14 · 7pm · Will's backyard");
    expect(text).toContain("3 confirmed");
    expect(text).toContain(
      "Menu prep\nBurgers — 3 burgers\n- Ground beef: 1 1/2 lb\n- Buns: 3 buns",
    );
    expect(text).toContain("Shopping\n[ ] Ground beef: 2 packs\n[ ] Buns: 1 pack");
    expect(text).toContain("Food notes (host only)\n- Dana (going): No dairy");
    expect(text).toContain("Notes don't automatically change recipe quantities");
    expect(text).not.toContain("Not coming");
  });

  it("does not put invitation links, codes, emails or payment details in the copy", () => {
    const sheet = buildPrepSheet({
      event,
      dishes: [burgers],
      headcount: computeHeadcount(yesGuests(3), 0.5),
      guests: [],
    });
    const text = prepSheetText(sheet);

    expect(text).not.toMatch(/https?:\/\//i);
    expect(text).not.toMatch(/invite|share code|venmo|@/i);
  });
});
