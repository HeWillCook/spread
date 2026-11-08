import { and, asc, eq, sql } from "drizzle-orm";
import type { Db } from "@/db/client";
import { eventDishes, extraCosts, recipeItems, shoppingState } from "@/db/schema";
import type { Headcount } from "@/domain/headcount";
import { formatCents } from "@/domain/money";
import { buildShoppingList, totalCents, type ShoppingLine } from "@/domain/shopping";
import { NotFoundError, ValidationError } from "./errors";
import { getHostEvent } from "./events";
import { getGuestsOverview } from "./guestsOverview";
import { getMenu } from "./menu";

export interface ShoppingPlan {
  headcount: Headcount;
  lines: (ShoppingLine & { checked: boolean; actualCents: number | null })[];
  extras: { id: string; label: string; amountCents: number }[];
  /** Actual price where entered, else the estimate, plus extras. Integer cents. */
  totalCents: number;
}

const MAX_LABEL = 80;
// Sanity ceiling so a typo can't overflow the integer column.
const MAX_CENTS = 1_000_000;
const MAX_EXTRAS = 50;

function validCents(cents: number, what: string): void {
  if (!Number.isInteger(cents) || cents < 0 || cents > MAX_CENTS) {
    throw new ValidationError(`${what} must be between $0.00 and ${formatCents(MAX_CENTS)}`);
  }
}

/** Throws unless the item belongs to a dish on this event: state is never written for foreign items. */
async function assertEventItem(db: Db, eventId: string, recipeItemId: string): Promise<void> {
  const [row] = await db
    .select({ id: recipeItems.id })
    .from(eventDishes)
    .innerJoin(recipeItems, eq(recipeItems.recipeId, eventDishes.recipeId))
    .where(and(eq(eventDishes.eventId, eventId), eq(recipeItems.id, recipeItemId)))
    .limit(1);
  if (!row) throw new NotFoundError("Ingredient not found");
}

/** Everything the Shopping tab shows. Throws NotFoundError for another host's event. */
export async function getShoppingPlan(
  db: Db,
  hostId: string,
  eventId: string,
): Promise<ShoppingPlan> {
  await getHostEvent(db, hostId, eventId);
  const [{ headcount }, { dishes }, stateRows, extraRows] = await Promise.all([
    getGuestsOverview(db, hostId, eventId),
    getMenu(db, hostId, eventId),
    db.select().from(shoppingState).where(eq(shoppingState.eventId, eventId)),
    db
      .select()
      .from(extraCosts)
      .where(eq(extraCosts.eventId, eventId))
      .orderBy(asc(extraCosts.label), asc(extraCosts.id)),
  ]);

  const built = buildShoppingList(
    dishes.map((d) => ({ recipe: d.recipe, servingsPerPerson: d.servingsPerPerson })),
    headcount.planFor,
  );
  const stateByItem = new Map(stateRows.map((s) => [s.recipeItemId, s]));
  const lines = built.map((line) => {
    const state = stateByItem.get(line.itemId);
    return { ...line, checked: state?.checked ?? false, actualCents: state?.actualCents ?? null };
  });

  const actualByItemId: Record<string, number> = {};
  for (const line of lines) {
    if (line.actualCents !== null) actualByItemId[line.itemId] = line.actualCents;
  }
  const extras = extraRows.map((e) => ({ id: e.id, label: e.label, amountCents: e.amountCents }));

  return {
    headcount,
    lines,
    extras,
    totalCents: totalCents(
      lines,
      actualByItemId,
      extras.map((e) => e.amountCents),
    ),
  };
}

/** Ticks or unticks an ingredient. Keeps any actual price already entered. */
export async function setChecked(
  db: Db,
  hostId: string,
  eventId: string,
  recipeItemId: string,
  checked: boolean,
): Promise<void> {
  await getHostEvent(db, hostId, eventId);
  await assertEventItem(db, eventId, recipeItemId);
  await db
    .insert(shoppingState)
    .values({ eventId, recipeItemId, checked })
    .onConflictDoUpdate({
      target: [shoppingState.eventId, shoppingState.recipeItemId],
      set: { checked },
    });
}

/** Records what was really paid; null goes back to the estimate. Keeps the tick. */
export async function setActualCost(
  db: Db,
  hostId: string,
  eventId: string,
  recipeItemId: string,
  cents: number | null,
): Promise<void> {
  await getHostEvent(db, hostId, eventId);
  if (cents !== null) validCents(cents, "Price");
  await assertEventItem(db, eventId, recipeItemId);
  await db
    .insert(shoppingState)
    .values({ eventId, recipeItemId, actualCents: cents })
    .onConflictDoUpdate({
      target: [shoppingState.eventId, shoppingState.recipeItemId],
      set: { actualCents: cents },
    });
}

/** Adds a cost that isn't on the list (ice, charcoal, drinks). */
export async function addExtraCost(
  db: Db,
  hostId: string,
  eventId: string,
  label: string,
  cents: number,
): Promise<void> {
  await getHostEvent(db, hostId, eventId);
  const clean = typeof label === "string" ? label.trim() : "";
  if (!clean) throw new ValidationError("Give the cost a name, like Ice");
  if (clean.length > MAX_LABEL) {
    throw new ValidationError(`The name can be at most ${MAX_LABEL} characters`);
  }
  validCents(cents, "Amount");
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(extraCosts)
    .where(eq(extraCosts.eventId, eventId));
  if (count >= MAX_EXTRAS) {
    throw new ValidationError(`You can add up to ${MAX_EXTRAS} extra costs`);
  }
  await db.insert(extraCosts).values({ eventId, label: clean, amountCents: cents });
}

/** Removes an extra cost from this event. Throws NotFoundError if it isn't one of its extras. */
export async function removeExtraCost(
  db: Db,
  hostId: string,
  eventId: string,
  extraId: string,
): Promise<void> {
  await getHostEvent(db, hostId, eventId);
  const removed = await db
    .delete(extraCosts)
    .where(and(eq(extraCosts.id, extraId), eq(extraCosts.eventId, eventId)))
    .returning({ id: extraCosts.id });
  if (removed.length === 0) throw new NotFoundError("Cost not found");
}
