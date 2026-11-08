import { describe, expect, it } from "vitest";
import { amountLabel, appetiteLabel, formatAmount, parseNumber, servingWord } from "./menu-text";

describe("menu text helpers", () => {
  it("formats amounts without float noise or trailing zeros", () => {
    expect(formatAmount(1 / 3)).toBe("0.3333");
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

  it("derives the serving word and labels from the recipe name", () => {
    expect(servingWord("Burgers")).toBe("burger");
    expect(servingWord("Potato salad")).toBe("serving");
    expect(servingWord("Glass")).toBe("serving");
    expect(appetiteLabel("Burgers")).toBe("burgers per person");
    expect(appetiteLabel("Potato salad")).toBe("servings of potato salad per person");
    expect(amountLabel("lb", "Burgers")).toBe("lb per burger");
    expect(amountLabel("slice", "Pizza")).toBe("slice per serving");
  });
});
