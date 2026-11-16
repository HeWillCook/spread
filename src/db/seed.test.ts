// @vitest-environment node
import { eq } from "drizzle-orm";
import { describe, expect, it, vi } from "vitest";

// A stand-in starter so the seed's instruction columns can be checked without waiting on
// the full recipe library's text. vi.hoisted keeps it visible to the hoisted mock factory.
const { STARTER } = vi.hoisted(() => ({
  STARTER: [
    {
      id: "starter-test-burgers",
      name: "Burgers",
      emoji: "🍔",
      category: "Grill",
      defaultServingsPerPerson: 1.5,
      description: "Smash-style patties",
      prepMinutes: 15,
      cookMinutes: 20,
      steps: ["Form the patties.", "Grill 4 minutes a side."],
      tips: ["Toast the buns."],
      equipment: ["Grill", "Instant-read thermometer"],
      items: [
        {
          id: "starter-test-burgers-beef",
          name: "Ground beef",
          emoji: "🥩",
          perServing: 1 / 3,
          unit: "lb",
          buyUnit: "lb",
          unitsPerBuy: 1,
          priceCents: 650,
        },
      ],
    },
  ],
}));

vi.mock("@/domain/recipes", () => ({ STARTER_RECIPES: STARTER }));

import { createTestDb } from "./test-db";
import { seedStarterRecipes } from "./seed";
import { recipes } from "./schema";

describe("seedStarterRecipes instructions", () => {
  it("writes the how-to-make-it fields", async () => {
    const db = await createTestDb();
    await seedStarterRecipes(db);

    const [row] = await db.select().from(recipes).where(eq(recipes.id, "starter-test-burgers"));
    expect(row).toMatchObject({
      ownerId: null,
      description: "Smash-style patties",
      prepMinutes: 15,
      cookMinutes: 20,
      steps: ["Form the patties.", "Grill 4 minutes a side."],
      tips: ["Toast the buns."],
      equipment: ["Grill", "Instant-read thermometer"],
      originRecipeId: null,
    });
  }, 20_000);

  it("refreshes stale instructions in an existing database", async () => {
    const db = await createTestDb();
    await seedStarterRecipes(db);
    await db
      .update(recipes)
      .set({ steps: ["Old step"], tips: [], equipment: [], description: "Old", prepMinutes: 1 })
      .where(eq(recipes.id, "starter-test-burgers"));

    await seedStarterRecipes(db);

    const [row] = await db.select().from(recipes).where(eq(recipes.id, "starter-test-burgers"));
    expect(row.steps).toEqual(["Form the patties.", "Grill 4 minutes a side."]);
    expect(row.tips).toEqual(["Toast the buns."]);
    expect(row.equipment).toEqual(["Grill", "Instant-read thermometer"]);
    expect(row.description).toBe("Smash-style patties");
    expect(row.prepMinutes).toBe(15);
  }, 20_000);
});
