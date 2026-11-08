import { STARTER_RECIPES } from "@/domain/recipes";
import type { Db } from "./client";
import { recipeItems, recipes } from "./schema";

/** Inserts the global starter recipes (owner_id null). Safe to run repeatedly. */
export async function seedStarterRecipes(db: Db): Promise<void> {
  for (const recipe of STARTER_RECIPES) {
    await db
      .insert(recipes)
      .values({
        id: recipe.id,
        ownerId: null,
        name: recipe.name,
        emoji: recipe.emoji,
        defaultServingsPerPerson: recipe.defaultServingsPerPerson,
      })
      .onConflictDoNothing();

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
        .onConflictDoNothing();
    }
  }
}
