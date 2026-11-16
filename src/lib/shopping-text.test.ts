import { describe, expect, it } from "vitest";
import { computeHeadcount } from "@/domain/headcount";
import { STARTER_RECIPES } from "@/domain/recipes";
import { buildShoppingList } from "@/domain/shopping";
import {
  biggestLine,
  formatBuyQty,
  formatNeed,
  formatQty,
  headcountLine,
  rangeNote,
  shoppingListText,
} from "./shopping-text";

const guests = (yes: number, maybe: number) => [
  ...Array.from({ length: yes }, () => ({ status: "yes" as const, plusOnes: 0 })),
  ...Array.from({ length: maybe }, () => ({ status: "maybe" as const, plusOnes: 0 })),
];

describe("formatBuyQty", () => {
  it("pluralises sensibly", () => {
    expect(formatBuyQty(8, "lb")).toBe("8 lb");
    expect(formatBuyQty(1, "pack")).toBe("1 pack");
    expect(formatBuyQty(3, "pack")).toBe("3 packs");
    expect(formatBuyQty(4, "each")).toBe("4 each");
    expect(formatBuyQty(2, "box")).toBe("2 boxes");
    expect(formatBuyQty(2, "bunch")).toBe("2 bunches");
    expect(formatBuyQty(2, "jar")).toBe("2 jars");
    expect(formatBuyQty(2, "pastry")).toBe("2 pastries");
    expect(formatBuyQty(2, "bags")).toBe("2 bags");
  });
});

describe("formatQty / formatNeed", () => {
  it("keeps whole numbers and common kitchen fractions readable", () => {
    expect(formatQty(18)).toBe("18");
    expect(formatQty(1)).toBe("1");
    expect(formatQty(0.5)).toBe("1/2");
    expect(formatQty(1 / 3)).toBe("1/3");
    expect(formatQty(1.5)).toBe("1 1/2");
    expect(formatQty(2 / 3)).toBe("2/3");
    expect(formatQty(1.25)).toBe("1 1/4");
    expect(formatQty(3 / 4)).toBe("3/4");
    expect(formatQty(2.5)).toBe("2 1/2");
  });

  it("never shows a raw repeating decimal", () => {
    expect(formatQty(1 / 6)).toBe("0.17");
    expect(formatQty(0.1667)).toBe("0.17");
    expect(formatQty(10.541666)).toBe("10.54");
    expect(formatQty(0)).toBe("0");
    expect(formatQty(Number.NaN)).toBe("0");
  });

  it("says the need and the pack size", () => {
    expect(formatNeed(18, "bun", "pack", 8)).toBe("18 buns (packs of 8)");
    expect(formatNeed(1.5, "lb", "lb", 1)).toBe("1 1/2 lb");
    expect(formatNeed(1, "onion", "each", 1)).toBe("1 onion");
    expect(formatNeed(0.17, "onion", "each", 1)).toBe("0.17 onions");
  });
});

describe("shoppingListText", () => {
  it("groups by aisle with unchecked items first", () => {
    const text = shoppingListText([
      { name: "Onion", buyQty: 3, buyUnit: "each", checked: false, dishNames: ["Burgers", "Hot dogs"] },
      { name: "Jalapeño", buyQty: 6, buyUnit: "each", checked: true, dishNames: ["Burgers"] },
      { name: "Ground beef", buyQty: 8, buyUnit: "lb", checked: true, dishNames: ["Burgers"] },
      { name: "Burger buns", buyQty: 3, buyUnit: "pack", checked: false, dishNames: ["Burgers"] },
    ]);
    expect(text).toBe(
      [
        "PRODUCE",
        "- [ ] Onion: 3 (for Burgers, Hot dogs)",
        "- [x] Jalapeño: 6",
        "",
        "MEAT & SEAFOOD",
        "- [x] Ground beef: 8 lb",
        "",
        "BAKERY",
        "- [ ] Burger buns: 3 packs",
      ].join("\n"),
    );
  });

  it("is empty for an empty list", () => {
    expect(shoppingListText([])).toBe("");
  });
});

describe("headcountLine", () => {
  it("counts plus-ones as confirmed people rather than RSVP answers", () => {
    expect(headcountLine(computeHeadcount([{ status: "yes", plusOnes: 1 }], 0.5))).toBe(
      "2 confirmed",
    );
  });
  it("12 yes + 5 maybes at 50%", () => {
    expect(headcountLine(computeHeadcount(guests(12, 5), 0.5))).toBe(
      "12 confirmed + ~3 from maybes · range 12–17",
    );
  });
  it("drops the maybes clause when nothing is planned from them", () => {
    expect(headcountLine(computeHeadcount(guests(12, 5), 0))).toBe("12 confirmed · range 12–17");
  });
  it("drops the range when there are no maybes", () => {
    expect(headcountLine(computeHeadcount(guests(12, 0), 0.5))).toBe("12 confirmed");
  });
});

describe("biggestLine / rangeNote", () => {
  const dishes = [{ dishId: "d", servingsPerPerson: 1.5, recipe: STARTER_RECIPES[0], isStarter: true }];
  const headcount = computeHeadcount(guests(12, 5), 0.5);

  it("picks the beef as the biggest item", () => {
    const lines = buildShoppingList(dishes, headcount.planFor);
    expect(biggestLine(lines)?.name).toBe("Ground beef");
    expect(biggestLine([])).toBeNull();
  });

  it("shows beef at 12 people vs 17 people", () => {
    // 12 heads: 18 burgers -> 6 lb. 17 heads: ceil(25.5)=26 -> 9 lb.
    expect(rangeNote(dishes, headcount, "starter-burgers-beef", "lb")).toBe("range 6–9 lb");
  });

  it("is null with no range or when the item doesn't move", () => {
    expect(rangeNote(dishes, computeHeadcount(guests(12, 0), 0.5), "starter-burgers-beef", "lb")).toBeNull();
    expect(rangeNote(dishes, headcount, "missing", "lb")).toBeNull();
  });
});
