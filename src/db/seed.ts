import { and, eq, notInArray } from "drizzle-orm";
import { STARTER_RECIPES } from "@/domain/recipes";
import type { Db } from "./client";
import { recipeItems, recipes } from "./schema";

/**
 * Inserts or updates the global starter recipes (owner_id null). Safe to run repeatedly.
 *
 * Starters are read-only for hosts (editing one makes a copy), so a corrected quantity or
 * price in code should reach an existing database on the next boot rather than staying
 * stale. Items that disappeared from a recipe in code are removed too.
 */
export async function seedStarterRecipes(db: Db): Promise<void> {
  for (const recipe of STARTER_RECIPES) {
    // A starter may be filled in group by group, so treat unfinished text as empty.
    const instructions = {
      description: recipe.description ?? null,
      prepMinutes: recipe.prepMinutes ?? null,
      cookMinutes: recipe.cookMinutes ?? null,
      steps: recipe.steps ?? [],
      tips: recipe.tips ?? [],
      equipment: recipe.equipment ?? [],
    };
    await db
      .insert(recipes)
      .values({
        id: recipe.id,
        ownerId: null,
        name: recipe.name,
        emoji: recipe.emoji,
        defaultServingsPerPerson: recipe.defaultServingsPerPerson,
        ...instructions,
      })
      .onConflictDoUpdate({
        target: recipes.id,
        set: {
          ownerId: null,
          name: recipe.name,
          emoji: recipe.emoji,
          defaultServingsPerPerson: recipe.defaultServingsPerPerson,
          ...instructions,
        },
      });

    for (const [position, item] of recipe.items.entries()) {
      await db
        .insert(recipeItems)
        .values({
          id: item.id,
          recipeId: recipe.id,
          name: item.name,
          emoji: item.emoji,
          perServing: item.perServing,
          unit: item.unit,
          buyUnit: item.buyUnit,
          unitsPerBuy: item.unitsPerBuy,
          priceCents: item.priceCents,
          position,
        })
        .onConflictDoUpdate({
          target: recipeItems.id,
          set: {
            name: item.name,
            emoji: item.emoji,
            perServing: item.perServing,
            unit: item.unit,
            buyUnit: item.buyUnit,
            unitsPerBuy: item.unitsPerBuy,
            priceCents: item.priceCents,
            position,
          },
        });
    }

    await db.delete(recipeItems).where(
      and(
        eq(recipeItems.recipeId, recipe.id),
        notInArray(
          recipeItems.id,
          recipe.items.map((item) => item.id),
        ),
      ),
    );
  }
}
