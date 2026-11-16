import { describe, expect, it } from "vitest";
import {
  amountLabel,
  appetiteLabel,
  buyHint,
  formatAmount,
  formatIngredientAmount,
  formatQuantity,
  parseNumber,
  servingWord,
  timeRow,
  totalTimeLabel,
} from "./menu-text";

describe("menu text helpers", () => {
  it("formats amounts without float noise or trailing zeros, at most 3 decimals", () => {
    expect(formatAmount(1 / 6)).toBe("0.167");
    expect(formatAmount(1 / 3)).toBe("0.333");
    expect(formatAmount(1.5)).toBe("1.5");
    expect(formatAmount(8)).toBe("8");
    expect(formatAmount(0.25)).toBe("0.25");
    expect(formatAmount(Number.NaN)).toBe("");
  });

  it("parses numbers strictly", () => {
    expect(parseNumber("1.5")).toBe(1.5);
    expect(parseNumber(" 2 ")).toBe(2);
    expect(parseNumber("")).toBeNaN();
    expect(parseNumber("   ")).toBeNaN();
    expect(parseNumber("abc")).toBeNaN();
    expect(parseNumber(null)).toBeNaN();
    expect(parseNumber(new File([], "x"))).toBeNaN();
  });

  it("only singularizes a safe plural", () => {
    expect(servingWord("Burgers")).toBe("burger");
    expect(servingWord("Berries")).toBe("berry");
    expect(servingWord("Potato salad")).toBe("serving");
    expect(servingWord("Glass")).toBe("glass");
    expect(servingWord("Hummus")).toBe("hummus");
    expect(servingWord("Couscous")).toBe("couscous");
    expect(servingWord("Basis")).toBe("basis");
    expect(servingWord("Pie")).toBe("serving");
    expect(appetiteLabel("Burgers")).toBe("burgers per person");
    expect(appetiteLabel("Hummus")).toBe("hummus per person");
    expect(appetiteLabel("Potato salad")).toBe("servings of potato salad per person");
    expect(amountLabel("lb", "Burgers")).toBe("lb per burger");
    expect(amountLabel("slice", "Pizza")).toBe("slice per serving");
  });

  it("formats readable quantities with nice fractions", () => {
    expect(formatQuantity(0.5)).toBe("1/2");
    expect(formatQuantity(1 / 3)).toBe("1/3");
    expect(formatQuantity(2 / 3)).toBe("2/3");
    expect(formatQuantity(0.25)).toBe("1/4");
    expect(formatQuantity(1.33)).toBe("1 1/3");
    expect(formatQuantity(2.25)).toBe("2 1/4");
    expect(formatQuantity(1 / 6)).toBe("0.17");
    expect(formatQuantity(8)).toBe("8");
    expect(formatQuantity(1.999)).toBe("2");
    expect(formatQuantity(Number.NaN)).toBe("");
  });

  it("scales quantities with the right singular or plural unit", () => {
    expect(formatIngredientAmount(5 / 3, "onion")).toBe("1 2/3 onions");
    expect(formatIngredientAmount(1.33, "onion")).toBe("1 1/3 onions");
    expect(formatIngredientAmount(0.5, "lemon")).toBe("1/2 lemon");
    expect(formatIngredientAmount(1, "onion")).toBe("1 onion");
    expect(formatIngredientAmount(1.5, "lb")).toBe("1 1/2 lb");
    expect(formatIngredientAmount(2, "bun")).toBe("2 buns");
    expect(formatIngredientAmount(2, "tomato")).toBe("2 tomatoes");
    expect(formatIngredientAmount(0, "onion")).toBe("0 onions");
  });

  it("explains how an ingredient is sold", () => {
    expect(
      buyHint({ buyUnit: "each", unitsPerBuy: 1, unit: "onion", priceCents: 100 }, "$1.00"),
    ).toBe("Sold individually, $1.00");
    expect(
      buyHint({ buyUnit: "pack", unitsPerBuy: 8, unit: "bun", priceCents: 350 }, "$3.50"),
    ).toBe("Sold in packs of 8 buns, $3.50");
    expect(
      buyHint({ buyUnit: "lb", unitsPerBuy: 1, unit: "lb", priceCents: 650 }, "$6.50"),
    ).toBe("Sold by the lb, $6.50");
  });

  it("builds the time row and total from whatever times exist", () => {
    expect(timeRow({ prepMinutes: 15, cookMinutes: 20 })).toBe(
      "Prep 15 min · Cook 20 min · Total 35 min",
    );
    expect(timeRow({ prepMinutes: 15 })).toBe("Prep 15 min");
    expect(timeRow({})).toBeNull();
    expect(totalTimeLabel({ prepMinutes: 15, cookMinutes: 20 })).toBe("35 min");
    expect(totalTimeLabel({ cookMinutes: 20 })).toBe("20 min");
    expect(totalTimeLabel({})).toBeNull();
  });
});
