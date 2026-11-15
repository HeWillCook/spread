import { describe, expect, it } from "vitest";
import type { Headcount } from "@/domain/headcount";
import { STARTER_RECIPES } from "@/domain/recipes";
import type { MenuDish } from "@/services/menu";
import {
  attendancePresets,
  buildAttendancePreview,
  customHeadcountLimit,
  parseCustomHeadcount,
  preparedServings,
} from "./attendance-preview";

const burgers: MenuDish = {
  dishId: "dish-burgers",
  servingsPerPerson: 1.5,
  recipe: STARTER_RECIPES[0],
  isStarter: true,
};

const plan: Headcount = {
  confirmed: 2,
  maybeHeads: 2,
  expectedFromMaybes: 1,
  planFor: 3,
  low: 2,
  high: 4,
};

const noMaybes: Headcount = {
  confirmed: 4,
  maybeHeads: 0,
  expectedFromMaybes: 0,
  planFor: 4,
  low: 4,
  high: 4,
};

const empty: Headcount = {
  confirmed: 0,
  maybeHeads: 0,
  expectedFromMaybes: 0,
  planFor: 0,
  low: 0,
  high: 0,
};

describe("attendancePresets", () => {
  it("offers confirmed, the saved plan, and every maybe as whole heads", () => {
    expect(attendancePresets(plan).map((preset) => [preset.id, preset.heads])).toEqual([
      ["confirmed", 2],
      ["plan", 3],
      ["all", 4],
    ]);
  });

  it("keeps equal presets separate instead of inventing a difference", () => {
    const presets = attendancePresets(noMaybes);
    expect(presets.map((preset) => preset.heads)).toEqual([4, 4, 4]);
    expect(presets.map((preset) => preset.label)).toEqual([
      "Confirmed",
      "Current plan",
      "All maybes",
    ]);
  });
});

describe("customHeadcountLimit", () => {
  it("leaves room above the largest saved count", () => {
    expect(customHeadcountLimit(plan)).toBe(29);
    expect(customHeadcountLimit({ ...plan, high: 40 })).toBe(65);
  });

  it("never caps below an existing event count", () => {
    const big: Headcount = {
      confirmed: 80,
      maybeHeads: 0,
      expectedFromMaybes: 0,
      planFor: 80,
      low: 80,
      high: 80,
    };
    expect(customHeadcountLimit(big)).toBeGreaterThanOrEqual(big.high);
  });

  it("still bounds an empty event", () => {
    expect(customHeadcountLimit(empty)).toBe(25);
  });
});

describe("parseCustomHeadcount", () => {
  it("accepts zero and whole numbers within the limit", () => {
    expect(parseCustomHeadcount("0", plan)).toEqual({ heads: 0, error: null });
    expect(parseCustomHeadcount("  5 ", plan)).toEqual({ heads: 5, error: null });
    expect(parseCustomHeadcount("29", plan)).toEqual({ heads: 29, error: null });
  });

  it("rejects blank, fractional, negative, and junk text", () => {
    expect(parseCustomHeadcount("", plan)).toEqual({
      heads: null,
      error: "Enter a whole number of people.",
    });
    expect(parseCustomHeadcount("2.5", plan)).toEqual({
      heads: null,
      error: "Use a whole number of people.",
    });
    expect(parseCustomHeadcount("-1", plan)).toEqual({
      heads: null,
      error: "Use a whole number of people.",
    });
    expect(parseCustomHeadcount("two", plan)).toEqual({
      heads: null,
      error: "Use a whole number of people.",
    });
  });

  it("rejects a count above the bounded exploration limit", () => {
    expect(parseCustomHeadcount("30", plan)).toEqual({
      heads: null,
      error: "Choose 29 people or fewer.",
    });
  });
});

describe("preparedServings", () => {
  it("rounds dish servings up like the shopping list does", () => {
    expect(preparedServings(3, 1.5)).toBe(5);
    expect(preparedServings(4, 1.5)).toBe(6);
    expect(preparedServings(0, 1.5)).toBe(0);
    expect(preparedServings(3, 0)).toBe(0);
  });
});

describe("buildAttendancePreview", () => {
  it("compares rounded buy quantities and ingredient estimates with the saved plan", () => {
    const preview = buildAttendancePreview([burgers], plan, 2);
    expect(preview.heads).toBe(2);
    expect(preview.baselineHeads).toBe(3);
    expect(preview.matchesSavedPlan).toBe(false);

    const beef = preview.lines.find((line) => line.itemId === "starter-burgers-beef");
    expect(beef).toMatchObject({
      buyQty: 1,
      baselineBuyQty: 2,
      buyQtyDelta: -1,
      estCostCents: 650,
      baselineCostCents: 1300,
      costDeltaCents: -650,
    });
    expect(preview.estCostCents).toBe(1750);
    expect(preview.baselineEstCostCents).toBe(2450);
    expect(preview.costDeltaCents).toBe(-700);
    expect(preview.dishes[0]).toMatchObject({ servings: 3, baselineServings: 5 });
  });

  it("rounds up packs instead of showing fractional buys", () => {
    const preview = buildAttendancePreview([burgers], plan, 6);
    const buns = preview.lines.find((line) => line.itemId === "starter-burgers-buns");
    expect(buns).toMatchObject({
      buyQty: 2,
      baselineBuyQty: 1,
      buyQtyDelta: 1,
      estCostCents: 700,
      costDeltaCents: 350,
    });
    expect(preview.dishes[0].servings).toBe(9);
  });

  it("sums its line deltas into the ingredient estimate delta", () => {
    const preview = buildAttendancePreview([burgers], plan, 5);
    const lineDelta = preview.lines.reduce((sum, line) => sum + line.costDeltaCents, 0);
    expect(preview.costDeltaCents).toBe(lineDelta);
    expect(preview.estCostCents).toBe(3200);
    expect(preview.baselineEstCostCents).toBe(2450);
  });

  it("marks the saved plan as a match", () => {
    const preview = buildAttendancePreview([burgers], plan, 3);
    expect(preview.matchesSavedPlan).toBe(true);
    expect(preview.costDeltaCents).toBe(0);
    expect(preview.lines.every((line) => line.buyQtyDelta === 0)).toBe(true);
  });

  it("handles zero people without NaN or negative quantities", () => {
    const preview = buildAttendancePreview([burgers], empty, 0);
    expect(preview.estCostCents).toBe(0);
    expect(preview.lines.every((line) => line.buyQty === 0 && line.estCostCents === 0)).toBe(true);
    expect(preview.dishes[0].servings).toBe(0);
    expect(preview.lines.some((line) => Number.isNaN(line.buyQty))).toBe(false);
  });

  it("handles an empty menu", () => {
    const preview = buildAttendancePreview([], plan, 4);
    expect(preview.lines).toEqual([]);
    expect(preview.dishes).toEqual([]);
    expect(preview.estCostCents).toBe(0);
    expect(preview.baselineEstCostCents).toBe(0);
    expect(preview.costDeltaCents).toBe(0);
    expect(preview.matchesSavedPlan).toBe(false);
  });
});
