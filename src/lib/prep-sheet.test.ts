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
      expect.objectContaining({ name: "Ground beef", needed: 1.5, neededLabel: "1.5 lb" }),
      expect.objectContaining({ name: "Buns", needed: 3, neededLabel: "3 buns" }),
    ]);
    expect(sheet.shopping).toEqual([
      expect.objectContaining({ name: "Ground beef", buyQty: 2, buyLabel: "2 packs" }),
      expect.objectContaining({ name: "Buns", buyQty: 1, buyLabel: "1 pack" }),
    ]);
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
      "Menu prep\nBurgers — 3 burgers\n- Ground beef: 1.5 lb\n- Buns: 3 buns",
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
