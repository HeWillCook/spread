import { and, asc, eq, inArray, isNull, or } from "drizzle-orm";
import type { Db } from "@/db/client";
import { eventDishes, recipeItems, recipes, shoppingState } from "@/db/schema";
import type { Recipe, RecipeItem } from "@/domain/recipes";
import { NotFoundError, ValidationError } from "./errors";
import { getHostEvent } from "./events";

export interface MenuDish {
  dishId: string;
  servingsPerPerson: number;
  recipe: Recipe;
  /** True while the dish still points at a global starter recipe (a first edit makes a copy). */
  isStarter: boolean;
}

export interface MenuOverview {
  dishes: MenuDish[];
  /** Starter and the host's own recipes that are not on this event yet. */
  available: Recipe[];
}

export interface UpdateDishInput {
  servingsPerPerson: number;
  /** New amount per serving, keyed by recipe item id. Items not listed keep their amount. */
  itemAmounts: Record<string, number>;
}

export interface CustomRecipeInput {
  name: string;
  emoji: string;
  defaultServingsPerPerson: number;
  items: Omit<RecipeItem, "id">[];
}

const MAX_NAME = 80;
const MAX_EMOJI = 16;
const MAX_SERVINGS_PER_PERSON = 20;
const MIN_ITEMS = 1;
const MAX_ITEMS = 30;
// Sanity ceilings so a typo can't overflow the integer price column or make absurd lists.
const MAX_AMOUNT = 100_000;
const MAX_PRICE_CENTS = 1_000_000;

type RecipeRow = typeof recipes.$inferSelect;
type ItemRow = typeof recipeItems.$inferSelect;

function toItem(row: ItemRow): RecipeItem {
  return {
    id: row.id,
    name: row.name,
    emoji: row.emoji,
    perServing: row.perServing,
    unit: row.unit,
    buyUnit: row.buyUnit,
    unitsPerBuy: row.unitsPerBuy,
    priceCents: row.priceCents,
  };
}

function toRecipe(row: RecipeRow, items: ItemRow[]): Recipe {
  return {
    id: row.id,
    name: row.name,
    emoji: row.emoji,
    defaultServingsPerPerson: row.defaultServingsPerPerson,
    items: items.filter((i) => i.recipeId === row.id).map(toItem),
  };
}

async function loadItems(db: Db, recipeIds: string[]): Promise<ItemRow[]> {
  if (recipeIds.length === 0) return [];
  return db
    .select()
    .from(recipeItems)
    .where(inArray(recipeItems.recipeId, recipeIds))
    .orderBy(asc(recipeItems.position), asc(recipeItems.name));
}

// --- validation ---------------------------------------------------------------

function validServings(value: number, what: string): void {
  if (!Number.isFinite(value) || value < 0 || value > MAX_SERVINGS_PER_PERSON) {
    throw new ValidationError(`${what} must be a number from 0 to ${MAX_SERVINGS_PER_PERSON}`);
  }
}

function validAmount(value: number, what: string): void {
  if (!Number.isFinite(value) || value <= 0 || value > MAX_AMOUNT) {
    throw new ValidationError(`${what} must be a number greater than 0`);
  }
}

function validText(raw: string, what: string, max: number): string {
  const value = typeof raw === "string" ? raw.trim() : "";
  if (!value) throw new ValidationError(`${what} can't be empty`);
  if (value.length > max) throw new ValidationError(`${what} can be at most ${max} characters`);
  return value;
}

function cleanItem(item: Omit<RecipeItem, "id">): Omit<RecipeItem, "id"> {
  const name = validText(item.name, "Ingredient name", MAX_NAME);
  const label = `"${name}"`;
  validAmount(item.perServing, `Amount for ${label}`);
  validAmount(item.unitsPerBuy, `Units per buy for ${label}`);
  if (
    !Number.isInteger(item.priceCents) ||
    item.priceCents <= 0 ||
    item.priceCents > MAX_PRICE_CENTS
  ) {
    throw new ValidationError(`Price for ${label} must be more than $0.00`);
  }
  return {
    name,
    emoji: validText(item.emoji, `Emoji for ${label}`, MAX_EMOJI),
    perServing: item.perServing,
    unit: validText(item.unit, `Unit for ${label}`, MAX_NAME),
    buyUnit: validText(item.buyUnit, `Buy unit for ${label}`, MAX_NAME),
    unitsPerBuy: item.unitsPerBuy,
    priceCents: item.priceCents,
  };
}

// --- reads --------------------------------------------------------------------

interface OwnedRecipe {
  recipe: Recipe;
  /** null = global starter. */
  ownerId: string | null;
}

async function loadRecipesForHost(db: Db, hostId: string): Promise<OwnedRecipe[]> {
  const rows = await db
    .select()
    .from(recipes)
    .where(or(isNull(recipes.ownerId), eq(recipes.ownerId, hostId)))
    .orderBy(asc(recipes.name), asc(recipes.id));
  const items = await loadItems(
    db,
    rows.map((r) => r.id),
  );
  return rows.map((r) => ({ recipe: toRecipe(r, items), ownerId: r.ownerId }));
}

/** Global starter recipes plus this host's own, in name order. Other hosts' recipes never appear. */
export async function listRecipesForHost(db: Db, hostId: string): Promise<Recipe[]> {
  return (await loadRecipesForHost(db, hostId)).map((r) => r.recipe);
}

/** Everything the Menu tab shows. Throws NotFoundError for another host's event. */
export async function getMenu(db: Db, hostId: string, eventId: string): Promise<MenuOverview> {
  await getHostEvent(db, hostId, eventId);
  const [all, dishRows] = await Promise.all([
    loadRecipesForHost(db, hostId),
    db.select().from(eventDishes).where(eq(eventDishes.eventId, eventId)),
  ]);
  const byId = new Map(all.map((r) => [r.recipe.id, r]));
  const dishes: MenuDish[] = [];
  for (const row of dishRows) {
    const owned = byId.get(row.recipeId);
    // A dish always points at a global or this host's recipe; skip anything else defensively.
    if (!owned) continue;
    dishes.push({
      dishId: row.id,
      servingsPerPerson: row.servingsPerPerson,
      recipe: owned.recipe,
      isStarter: owned.ownerId === null,
    });
  }
  dishes.sort(
    (a, b) => a.recipe.name.localeCompare(b.recipe.name) || a.dishId.localeCompare(b.dishId),
  );
  const used = new Set(dishRows.map((d) => d.recipeId));
  return { dishes, available: all.map((r) => r.recipe).filter((r) => !used.has(r.id)) };
}

// --- writes -------------------------------------------------------------------

/** Adds a starter or the host's own recipe to the event at the recipe's default appetite. */
export async function addDishToEvent(
  db: Db,
  hostId: string,
  eventId: string,
  recipeId: string,
): Promise<{ dishId: string }> {
  await getHostEvent(db, hostId, eventId);
  return db.transaction(async (tx) => {
    const [recipe] = await tx
      .select()
      .from(recipes)
      .where(
        and(eq(recipes.id, recipeId), or(isNull(recipes.ownerId), eq(recipes.ownerId, hostId))),
      );
    if (!recipe) throw new NotFoundError("Recipe not found");

    const [already] = await tx
      .select({ id: eventDishes.id })
      .from(eventDishes)
      .where(and(eq(eventDishes.eventId, eventId), eq(eventDishes.recipeId, recipeId)));
    if (already) throw new ValidationError(`${recipe.name} is already on the menu`);

    const [dish] = await tx
      .insert(eventDishes)
      .values({ eventId, recipeId, servingsPerPerson: recipe.defaultServingsPerPerson })
      .returning({ id: eventDishes.id });
    return { dishId: dish.id };
  });
}

/**
 * Sets a dish's appetite and per-item amounts. The first edit of a global starter
 * recipe copies it for the host (the starter rows are never touched) and re-points
 * the dish, and any shopping state for this event, at the copy.
 */
export async function updateDish(
  db: Db,
  hostId: string,
  eventId: string,
  dishId: string,
  input: UpdateDishInput,
): Promise<void> {
  await getHostEvent(db, hostId, eventId);
  validServings(input.servingsPerPerson, "Servings per person");
  const entries = Object.entries(input.itemAmounts);
  for (const [, amount] of entries) validAmount(amount, "Amounts");

  await db.transaction(async (tx) => {
    const [dish] = await tx
      .select()
      .from(eventDishes)
      .where(and(eq(eventDishes.id, dishId), eq(eventDishes.eventId, eventId)));
    if (!dish) throw new NotFoundError("Dish not found");

    const [recipe] = await tx.select().from(recipes).where(eq(recipes.id, dish.recipeId));
    if (!recipe || (recipe.ownerId !== null && recipe.ownerId !== hostId)) {
      throw new NotFoundError("Dish not found");
    }
    const items = await loadItems(tx, [recipe.id]);
    const known = new Set(items.map((i) => i.id));
    if (entries.some(([itemId]) => !known.has(itemId))) {
      throw new ValidationError("That ingredient isn't part of this dish");
    }

    let recipeId = recipe.id;
    let targetItems = items;
    if (recipe.ownerId === null) {
      const [copy] = await tx
        .insert(recipes)
        .values({
          ownerId: hostId,
          name: recipe.name,
          emoji: recipe.emoji,
          defaultServingsPerPerson: recipe.defaultServingsPerPerson,
        })
        .returning();
      recipeId = copy.id;
      const inserted = await tx
        .insert(recipeItems)
        .values(
          items.map((i, position) => ({
            recipeId: copy.id,
            name: i.name,
            emoji: i.emoji,
            perServing: i.perServing,
            unit: i.unit,
            buyUnit: i.buyUnit,
            unitsPerBuy: i.unitsPerBuy,
            priceCents: i.priceCents,
            position,
          })),
        )
        .returning();
      // Match by position rather than trusting RETURNING order.
      targetItems = [...inserted].sort((a, b) => a.position - b.position);
      await tx.update(eventDishes).set({ recipeId }).where(eq(eventDishes.id, dishId));
      // Keep ticks and entered prices: move this event's state from each starter item to its copy.
      for (const [i, item] of items.entries()) {
        await tx
          .update(shoppingState)
          .set({ recipeItemId: targetItems[i].id })
          .where(and(eq(shoppingState.eventId, eventId), eq(shoppingState.recipeItemId, item.id)));
      }
    }

    const idMap = new Map(items.map((item, i) => [item.id, targetItems[i].id]));
    for (const [itemId, perServing] of entries) {
      await tx
        .update(recipeItems)
        .set({ perServing })
        .where(and(eq(recipeItems.id, idMap.get(itemId)!), eq(recipeItems.recipeId, recipeId)));
    }
    await tx
      .update(eventDishes)
      .set({ servingsPerPerson: input.servingsPerPerson })
      .where(eq(eventDishes.id, dishId));
  });
}

/** Creates a recipe owned by this host. Items keep the order given. */
export async function createCustomRecipe(
  db: Db,
  hostId: string,
  input: CustomRecipeInput,
): Promise<{ recipeId: string }> {
  const name = validText(input.name, "Dish name", MAX_NAME);
  const emoji = validText(input.emoji, "Dish emoji", MAX_EMOJI);
  validServings(input.defaultServingsPerPerson, "Servings per person");
  if (input.items.length < MIN_ITEMS || input.items.length > MAX_ITEMS) {
    throw new ValidationError(`A dish needs ${MIN_ITEMS} to ${MAX_ITEMS} ingredients`);
  }
  const items = input.items.map(cleanItem);

  return db.transaction(async (tx) => {
    const [recipe] = await tx
      .insert(recipes)
      .values({
        ownerId: hostId,
        name,
        emoji,
        defaultServingsPerPerson: input.defaultServingsPerPerson,
      })
      .returning({ id: recipes.id });
    await tx
      .insert(recipeItems)
      .values(items.map((item, position) => ({ ...item, recipeId: recipe.id, position })));
    return { recipeId: recipe.id };
  });
}

/** Removes a dish from the event, and the event's shopping state for its items. The recipe stays. */
export async function removeDish(
  db: Db,
  hostId: string,
  eventId: string,
  dishId: string,
): Promise<void> {
  await getHostEvent(db, hostId, eventId);
  await db.transaction(async (tx) => {
    const [dish] = await tx
      .select()
      .from(eventDishes)
      .where(and(eq(eventDishes.id, dishId), eq(eventDishes.eventId, eventId)));
    if (!dish) throw new NotFoundError("Dish not found");

    const items = await loadItems(tx, [dish.recipeId]);
    if (items.length > 0) {
      await tx.delete(shoppingState).where(
        and(
          eq(shoppingState.eventId, eventId),
          inArray(
            shoppingState.recipeItemId,
            items.map((i) => i.id),
          ),
        ),
      );
    }
    await tx.delete(eventDishes).where(eq(eventDishes.id, dishId));
  });
}
