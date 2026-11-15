import { describe, expect, it } from "vitest";
import { computeHeadcount } from "@/domain/headcount";
import { STARTER_RECIPES } from "@/domain/recipes";
import { buildShoppingList } from "@/domain/shopping";
import { biggestLine, formatBuyQty, headcountLine, rangeNote } from "./shopping-text";

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
