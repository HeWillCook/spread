import { describe, expect, it } from "vitest";
import { STARTER_RECIPES } from "./recipes";
import { AISLES, aisleFor, groupByAisle } from "./aisles";

describe("aisleFor", () => {
  it("maps every ingredient in the starter library to a real aisle", () => {
    const misc = new Set<string>();
    for (const recipe of STARTER_RECIPES) {
      for (const item of recipe.items) {
        const aisle = aisleFor(item.name);
        expect(AISLES, item.name).toContain(aisle);
        expect(misc.has(item.name), `${item.name} -> ${aisle}`).toBe(false);
        if (aisle === "Other") misc.add(item.name);
      }
    }
    // Deliberately unclassified: none. Add names here if a new starter ingredient
    // genuinely has no aisle rather than bending a keyword rule.
    expect([...misc]).toEqual([]);
  });

  it("files the tricky packaged names by what you'd actually buy", () => {
    expect(aisleFor("Onion")).toBe("Produce");
    expect(aisleFor("Jalapeño")).toBe("Produce");
    expect(aisleFor("Cherry tomatoes")).toBe("Produce");
    expect(aisleFor("Coleslaw mix")).toBe("Produce");
    expect(aisleFor("Ground beef")).toBe("Meat & seafood");
    expect(aisleFor("Hot dog sausages")).toBe("Meat & seafood");
    expect(aisleFor("Shrimp (raw, peeled)")).toBe("Meat & seafood");
    expect(aisleFor("Cheese slices")).toBe("Dairy & eggs");
    expect(aisleFor("Greek yogurt")).toBe("Dairy & eggs");
    expect(aisleFor("Burger buns")).toBe("Bakery");
    expect(aisleFor("Flour tortillas")).toBe("Bakery");
    expect(aisleFor("Bread crumbs")).toBe("Pantry & spices");
    expect(aisleFor("Tortilla chips")).toBe("Pantry & spices");
    expect(aisleFor("Maple syrup")).toBe("Pantry & spices");
    expect(aisleFor("Ice")).toBe("Frozen");
    expect(aisleFor("Veggie burger patties")).toBe("Frozen");
    expect(aisleFor("Iced tea bags")).toBe("Drinks");
    expect(aisleFor("Lemonade concentrate")).toBe("Drinks");
  });

  it("does not let a shorter word match inside a longer one", () => {
    // "iced" must not match the "ice" rule, and "lemonade" must not match "lemon".
    expect(aisleFor("Iced tea bags")).not.toBe("Frozen");
    expect(aisleFor("Lemonade concentrate")).not.toBe("Produce");
  });

  it("falls back to Other for things that are not food", () => {
    expect(aisleFor("Birthday candles")).toBe("Other");
    expect(aisleFor("")).toBe("Other");
  });
});

describe("groupByAisle", () => {
  it("uses aisle order, alphabetises within a group, and drops empty aisles", () => {
    const groups = groupByAisle([
      { name: "Mustard" },
      { name: "Onion" },
      { name: "Ground beef" },
      { name: "Apple" },
      { name: "Garlic" },
    ]);
    expect(groups.map((g) => g.aisle)).toEqual(["Produce", "Meat & seafood", "Pantry & spices"]);
    expect(groups[0].lines.map((l) => l.name)).toEqual(["Apple", "Garlic", "Onion"]);
  });
});
