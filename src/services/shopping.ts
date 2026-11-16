import { and, asc, eq, sql } from "drizzle-orm";
import type { Db } from "@/db/client";
import { extraCosts, shoppingState } from "@/db/schema";
import type { Headcount } from "@/domain/headcount";
import { formatCents } from "@/domain/money";
import { buildShoppingList, totalCents, type ShoppingLine } from "@/domain/shopping";
import { NotFoundError, ValidationError } from "./errors";
import { getHostEvent } from "./events";
import { getGuestsOverview } from "./guestsOverview";
import { getMenu } from "./menu";

export interface ShoppingPlan {
  headcount: Headcount;
  lines: (ShoppingLine & {
    /** Effective tick: false while the saved tick needs the host to confirm a bigger quantity. */
    checked: boolean;
    /** Buy units covered when the host ticked; null for a tick made before this was recorded. */
    checkedQty: number | null;
    /** True when the tick can no longer be trusted (quantity grew, or no basis was captured). */
    needsReview: boolean;
    actualCents: number | null;
    /** Dishes this ingredient belongs to, deduped in menu order, for "for Burgers, Hot dogs". */
    dishNames: string[];
  })[];
  extras: { id: string; label: string; amountCents: number }[];
  /** Actual price where entered, else the estimate, plus extras. Integer cents. */
  totalCents: number;
  /** True while any ticked line has an unresolved quantity issue; the total may move. */
  totalIsProvisional: boolean;
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

/**
 * The shopping line an ingredient id belongs to. A line may merge several item
 * ids; any of them resolves to the same line so the client can never tick a
 * stranger's row.
 */
function lineForItem(
  plan: ShoppingPlan,
  recipeItemId: string,
): ShoppingPlan["lines"][number] | undefined {
  return plan.lines.find((line) => line.itemIds.includes(recipeItemId));
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
    const states = line.itemIds.map((id) => stateByItem.get(id));
    // A merged line is only "got" when every ingredient that feeds it was ticked.
    const allTicked = states.every((state) => state?.checked === true);
    const checkedQtys = states.map((state) => state?.checkedQty ?? null);
    const checkedQty = checkedQtys.some((qty) => qty === null)
      ? null
      : Math.max(...(checkedQtys as number[]));
    // Ticks made before quantities were captured, and ticks that no longer cover
    // the current need, are conservatively treated as needing a recheck.
    const needsReview = allTicked && (checkedQty === null || line.buyQty > checkedQty);

    // The actual price lives on the line's primary (sorted-first) item id only; the
    // other merged ids are ignored even if an older row still carries a value.
    const actualCents = stateByItem.get(line.itemId)?.actualCents ?? null;
    const dishNames: string[] = [];
    for (const source of line.sources) {
      if (!dishNames.includes(source.recipeName)) dishNames.push(source.recipeName);
    }
    return {
      ...line,
      checked: allTicked && !needsReview,
      checkedQty,
      needsReview,
      actualCents,
      dishNames,
    };
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
    totalIsProvisional: lines.some((line) => line.needsReview),
  };
}

/**
 * Ticks or unticks an ingredient, writing every item id a merged line carries in
 * one transaction. Ticking captures the line's buy quantity, so a later increase
 * can tell the host the tick is stale; unchecking clears that basis. Any actual
 * price already entered is kept either way.
 */
export async function setChecked(
  db: Db,
  hostId: string,
  eventId: string,
  recipeItemId: string,
  checked: boolean,
): Promise<void> {
  await getHostEvent(db, hostId, eventId);
  const plan = await getShoppingPlan(db, hostId, eventId);
  const line = lineForItem(plan, recipeItemId);
  if (!line) throw new NotFoundError("Ingredient not found");
  const checkedQty = checked ? line.buyQty : null;
  // Every id stores the same basis: the line's buy quantity. A contribution that
  // grows without changing the pack count still leaves the tick valid, matching
  // the pre-merge behaviour.
  await db.transaction(async (tx) => {
    for (const itemId of line.itemIds) {
      await tx
        .insert(shoppingState)
        .values({ eventId, recipeItemId: itemId, checked, checkedQty })
        .onConflictDoUpdate({
          target: [shoppingState.eventId, shoppingState.recipeItemId],
          set: { checked, checkedQty },
        });
    }
  });
}

/**
 * Records what was really paid; null goes back to the estimate. Keeps the tick.
 *
 * A merged line keeps its price on the first item id (sorted order, so it is
 * stable). The other ids' prices are cleared, and reads ignore them, because the
 * line's price is the price of the whole purchase, not of each dish's share.
 */
export async function setActualCost(
  db: Db,
  hostId: string,
  eventId: string,
  recipeItemId: string,
  cents: number | null,
): Promise<void> {
  await getHostEvent(db, hostId, eventId);
  if (cents !== null) validCents(cents, "Price");
  const plan = await getShoppingPlan(db, hostId, eventId);
  const line = lineForItem(plan, recipeItemId);
  if (!line) throw new NotFoundError("Ingredient not found");
  const primaryId = line.itemId;
  const others = line.itemIds.filter((id) => id !== primaryId);
  await db.transaction(async (tx) => {
    await tx
      .insert(shoppingState)
      .values({ eventId, recipeItemId: primaryId, actualCents: cents })
      .onConflictDoUpdate({
        target: [shoppingState.eventId, shoppingState.recipeItemId],
        set: { actualCents: cents },
      });
    // Update-only: don't create empty state rows for the other merged ids.
    for (const itemId of others) {
      await tx
        .update(shoppingState)
        .set({ actualCents: null })
        .where(
          and(eq(shoppingState.eventId, eventId), eq(shoppingState.recipeItemId, itemId)),
        );
    }
  });
}

/** Adds a cost that isn't on the list (ice, charcoal, plates). */
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
