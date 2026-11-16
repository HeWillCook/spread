import { and, asc, eq, inArray, isNull, ne, or } from "drizzle-orm";
import type { Db } from "@/db/client";
import { eventDishes, recipeItems, recipes, shoppingState } from "@/db/schema";
import { formatCents } from "@/domain/money";
import { STARTER_RECIPES, type Recipe, type RecipeCategory, type RecipeItem } from "@/domain/recipes";
import { NotFoundError, ValidationError } from "./errors";
import { getHostEvent } from "./events";

/** A recipe plus the picker section it belongs in. Copies inherit their origin's. */
export interface MenuRecipe extends Recipe {
  category?: RecipeCategory;
}

export interface MenuDish {
  dishId: string;
  servingsPerPerson: number;
  recipe: MenuRecipe;
  /** True when the dish is a starter or a per-event copy of one (keeps the "Starter recipe" pill). */
  isStarter: boolean;
}

export interface MenuOverview {
  dishes: MenuDish[];
  /** Starter and the host's own recipes that are not on this event yet. */
  available: MenuRecipe[];
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
  description?: string | null;
  prepMinutes?: number | null;
  cookMinutes?: number | null;
  steps?: string[];
  tips?: string[];
  equipment?: string[];
}

const MAX_NAME = 80;
const MAX_EMOJI = 16;
const MAX_SERVINGS_PER_PERSON = 20;
const MIN_ITEMS = 1;
const MAX_ITEMS = 30;
// Sanity ceilings so a typo can't overflow the integer price column or make absurd lists.
const MAX_AMOUNT = 100_000;
const MAX_PRICE_CENTS = 1_000_000;
const MAX_DESCRIPTION = 400;
const MAX_INSTRUCTION = 600;
const MAX_INSTRUCTIONS = 30;
const MAX_MINUTES = 24 * 60;

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

function toRecipe(row: RecipeRow, items: ItemRow[]): MenuRecipe {
  const recipe: MenuRecipe = {
    id: row.id,
    name: row.name,
    emoji: row.emoji,
    defaultServingsPerPerson: row.defaultServingsPerPerson,
    items: items.filter((i) => i.recipeId === row.id).map(toItem),
  };
  if (row.description) recipe.description = row.description;
  if (row.prepMinutes !== null) recipe.prepMinutes = row.prepMinutes;
  if (row.cookMinutes !== null) recipe.cookMinutes = row.cookMinutes;
  if (row.steps.length > 0) recipe.steps = row.steps;
  if (row.tips.length > 0) recipe.tips = row.tips;
  if (row.equipment.length > 0) recipe.equipment = row.equipment;
  return recipe;
}

/** Categories of the built-in library, keyed by recipe id. */
const STARTER_CATEGORY = new Map<string, RecipeCategory>(
  STARTER_RECIPES.map((recipe) => [recipe.id, recipe.category]),
);

/**
 * The picker section for a recipe: its own starter category, or the category of the
 * starter it was copied from (following origin ids through chained copies).
 */
function categoryOf(row: RecipeRow, rowsById: Map<string, RecipeRow>): RecipeCategory | undefined {
  let current: RecipeRow | undefined = row;
  const seen = new Set<string>();
  while (current && !seen.has(current.id)) {
    seen.add(current.id);
    const category = STARTER_CATEGORY.get(current.id);
    if (category) return category;
    current = current.originRecipeId ? rowsById.get(current.originRecipeId) : undefined;
  }
  return undefined;
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
  if (!Number.isFinite(value) || value <= 0) {
    throw new ValidationError("Set at least a little per person, or remove the dish");
  }
  if (value > MAX_SERVINGS_PER_PERSON) {
    throw new ValidationError(`${what} must be at most ${MAX_SERVINGS_PER_PERSON}`);
  }
}

/** Per-serving amounts may be 0: the ingredient is skipped and shopping buys none of it. */
function validPerServing(value: number, what: string): void {
  if (!Number.isFinite(value) || value < 0 || value > MAX_AMOUNT) {
    throw new ValidationError(`${what} must be 0 or more`);
  }
}

function validUnitsPerBuy(value: number, what: string): void {
  if (!Number.isFinite(value) || value <= 0) {
    throw new ValidationError(`${what} must be more than 0`);
  }
  if (value > MAX_AMOUNT) {
    throw new ValidationError(`${what} must be ${MAX_AMOUNT} or less`);
  }
}

function validText(raw: string, what: string, max: number): string {
  const value = typeof raw === "string" ? raw.trim() : "";
  if (!value) throw new ValidationError(`${what} can't be empty`);
  if (value.length > max) throw new ValidationError(`${what} can be at most ${max} characters`);
  return value;
}

/** Optional free text (a description), trimmed; blank becomes null. */
function optionalText(raw: string | null | undefined, what: string, max: number): string | null {
  const value = typeof raw === "string" ? raw.trim() : "";
  if (!value) return null;
  if (value.length > max) throw new ValidationError(`${what} can be at most ${max} characters`);
  return value;
}

/** Optional whole minutes for prep/cook. A blank box clears the estimate. */
function optionalMinutes(
  raw: number | null | undefined,
  what: string,
): number | null {
  if (raw === null || raw === undefined) return null;
  if (!Number.isInteger(raw) || raw < 0 || raw > MAX_MINUTES) {
    throw new ValidationError(`${what} must be whole minutes from 0 to ${MAX_MINUTES}`);
  }
  return raw;
}

/** Optional list of lines (steps, tips, equipment): trimmed, blanks dropped. */
function optionalLines(
  raw: string[] | null | undefined,
  what: string,
  maxLength = MAX_INSTRUCTION,
): string[] {
  const values = (raw ?? [])
    .map((line) => (typeof line === "string" ? line.trim() : ""))
    .filter((line) => line.length > 0);
  if (values.length > MAX_INSTRUCTIONS) {
    throw new ValidationError(`${what} can have at most ${MAX_INSTRUCTIONS} lines`);
  }
  for (const value of values) {
    if (value.length > maxLength) {
      throw new ValidationError(`${what} lines can be at most ${maxLength} characters`);
    }
  }
  return values;
}

function cleanItem(item: Omit<RecipeItem, "id">): Omit<RecipeItem, "id"> {
  const name = validText(item.name, "Ingredient name", MAX_NAME);
  const label = `"${name}"`;
  validPerServing(item.perServing, `Amount for ${label}`);
  validUnitsPerBuy(item.unitsPerBuy, `Units per buy for ${label}`);
  // Free is fine (ice, pantry staples).
  if (
    !Number.isInteger(item.priceCents) ||
    item.priceCents < 0 ||
    item.priceCents > MAX_PRICE_CENTS
  ) {
    throw new ValidationError(
      `Price for ${label} must be between $0.00 and ${formatCents(MAX_PRICE_CENTS)}`,
    );
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
  recipe: MenuRecipe;
  /** null = global starter. */
  ownerId: string | null;
  /** The recipe this one was copied from, if any. */
  originRecipeId: string | null;
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
  const rowsById = new Map(rows.map((row) => [row.id, row]));
  return rows.map((r) => {
    const recipe = toRecipe(r, items);
    const category = categoryOf(r, rowsById);
    if (category) recipe.category = category;
    return { recipe, ownerId: r.ownerId, originRecipeId: r.originRecipeId };
  });
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
      // A copy of a starter keeps the pill so the host knows where the dish came from.
      isStarter: owned.ownerId === null || owned.recipe.category !== undefined,
    });
  }
  dishes.sort(
    (a, b) => a.recipe.name.localeCompare(b.recipe.name) || a.dishId.localeCompare(b.dishId),
  );
  // A dish hides its source recipe (and that source's own source) from the picker, so an
  // edited starter never shows up twice. Chained copies are walked once.
  const origins = new Map(all.map((owned) => [owned.recipe.id, owned.originRecipeId]));
  const used = new Set<string>();
  for (const dish of dishRows) {
    let current: string | null | undefined = dish.recipeId;
    while (current && !used.has(current)) {
      used.add(current);
      current = origins.get(current) ?? null;
    }
  }
  return { dishes, available: all.map((r) => r.recipe).filter((r) => !used.has(r.id)) };
}

// --- writes -------------------------------------------------------------------

/** Adds a starter or the host's own recipe to the event at the recipe's default appetite. */
export async function addDishToEvent(
  db: Db,
  hostId: string,
  eventId: string,
  recipeId: string,
): Promise<{ dishId: string; name: string }> {
  await getHostEvent(db, hostId, eventId);
  return db.transaction(async (tx) => {
    const [recipe] = await tx
      .select()
      .from(recipes)
      .where(
        and(eq(recipes.id, recipeId), or(isNull(recipes.ownerId), eq(recipes.ownerId, hostId))),
      );
    if (!recipe) throw new NotFoundError("Recipe not found");

    // The unique (event, recipe) index decides, so two racing adds still make one dish.
    const [dish] = await tx
      .insert(eventDishes)
      .values({ eventId, recipeId, servingsPerPerson: recipe.defaultServingsPerPerson })
      .onConflictDoNothing({ target: [eventDishes.eventId, eventDishes.recipeId] })
      .returning({ id: eventDishes.id });
    if (!dish) throw new ValidationError(`${recipe.name} is already on the menu`);
    return { dishId: dish.id, name: recipe.name };
  });
}

/**
 * Sets a dish's appetite and per-item amounts. A recipe that is global (a starter)
 * or used by another event's dish is copied for the host first, so starters and past
 * events never change: the copy takes over this event's dish and shopping state only.
 * A host's own recipe used by this event alone is edited in place.
 *
 * The dish row (then the recipe row) is locked for the whole transaction, so two
 * simultaneous edits serialize and the second sees the first's copy instead of cloning
 * again and stranding the shopping state on a leftover copy.
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
  for (const [, amount] of entries) validPerServing(amount, "Amounts");

  await db.transaction(async (tx) => {
    const [dish] = await tx
      .select()
      .from(eventDishes)
      .where(and(eq(eventDishes.id, dishId), eq(eventDishes.eventId, eventId)))
      .for("update");
    if (!dish) throw new NotFoundError("Dish not found");

    // Read after the dish lock, so this is the recipe the dish points at right now.
    const [recipe] = await tx.select().from(recipes).where(eq(recipes.id, dish.recipeId));
    if (!recipe || (recipe.ownerId !== null && recipe.ownerId !== hostId)) {
      throw new NotFoundError("Dish not found");
    }
    // Serialize edits of one host recipe shared by several events (never lock the global starters).
    if (recipe.ownerId !== null) {
      await tx.select({ id: recipes.id }).from(recipes).where(eq(recipes.id, recipe.id)).for("update");
    }
    const [usedElsewhere] = await tx
      .select({ id: eventDishes.id })
      .from(eventDishes)
      .where(and(eq(eventDishes.recipeId, recipe.id), ne(eventDishes.eventId, eventId)))
      .limit(1);
    const needsCopy = recipe.ownerId === null || usedElsewhere !== undefined;
    const items = await loadItems(tx, [recipe.id]);
    const known = new Set(items.map((i) => i.id));
    if (entries.some(([itemId]) => !known.has(itemId))) {
      throw new ValidationError("That ingredient isn't part of this dish");
    }

    let recipeId = recipe.id;
    let targetItems = items;
    if (needsCopy) {
      const [copy] = await tx
        .insert(recipes)
        .values({
          ownerId: hostId,
          name: recipe.name,
          emoji: recipe.emoji,
          defaultServingsPerPerson: recipe.defaultServingsPerPerson,
          // Keep the how-to-make-it text and remember where this copy came from.
          description: recipe.description,
          prepMinutes: recipe.prepMinutes,
          cookMinutes: recipe.cookMinutes,
          steps: recipe.steps,
          tips: recipe.tips,
          equipment: recipe.equipment,
          originRecipeId: recipe.id,
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
      // The copy is a brand-new recipe id, so this can't collide with the unique (event, recipe) index.
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
  const instructions = {
    description: optionalText(input.description, "Description", MAX_DESCRIPTION),
    prepMinutes: optionalMinutes(input.prepMinutes, "Prep minutes"),
    cookMinutes: optionalMinutes(input.cookMinutes, "Cook minutes"),
    steps: optionalLines(input.steps, "Steps"),
    tips: optionalLines(input.tips, "Tips"),
    equipment: optionalLines(input.equipment, "Equipment", MAX_NAME),
  };

  return db.transaction(async (tx) => {
    const [recipe] = await tx
      .insert(recipes)
      .values({
        ownerId: hostId,
        name,
        emoji,
        defaultServingsPerPerson: input.defaultServingsPerPerson,
        ...instructions,
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
