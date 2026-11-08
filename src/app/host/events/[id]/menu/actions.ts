"use server";

import { revalidatePath } from "next/cache";
import { notFound } from "next/navigation";
import type { MenuFormState } from "@/components/menu/menuForm";
import { getDb } from "@/db/client";
import { parseDollarsToCents } from "@/domain/money";
import { AMOUNT_PREFIX, NEW_DISH_FIELDS as F, SERVINGS_FIELD } from "@/lib/menu-fields";
import { formatAmount, parseNumber } from "@/lib/menu-text";
import { requireHost } from "@/server/auth";
import { NotFoundError, ValidationError } from "@/services/errors";
import {
  addDishToEvent,
  createCustomRecipe,
  getMenu,
  removeDish,
  updateDish,
} from "@/services/menu";

// Every action here takes the host from the session and the event/dish ids from
// server-side `bind`; only the recipe to add and the typed values come from the form.

/** Re-renders the tabs that depend on the menu (it also feeds Shopping and Split). */
function refresh(eventId: string) {
  revalidatePath(`/host/events/${encodeURIComponent(eventId)}`, "layout");
}

/** Runs a service call: friendly message for bad input, 404 for someone else's data. */
async function run(
  eventId: string,
  prev: MenuFormState,
  work: (hostId: string) => Promise<void>,
): Promise<MenuFormState> {
  const host = await requireHost();
  try {
    await work(host.id);
  } catch (error) {
    if (error instanceof ValidationError) return { error: error.message, saves: prev.saves };
    if (error instanceof NotFoundError) notFound();
    throw error;
  }
  refresh(eventId);
  return { error: null, saves: prev.saves + 1 };
}

export async function addDishAction(
  eventId: string,
  prev: MenuFormState,
  formData: FormData,
): Promise<MenuFormState> {
  const recipeId = formData.get("recipeId");
  return run(eventId, prev, async (hostId) => {
    if (typeof recipeId !== "string" || !recipeId) throw new ValidationError("Pick a dish to add");
    await addDishToEvent(await getDb(), hostId, eventId, recipeId);
  });
}

export async function updateDishAction(
  eventId: string,
  dishId: string,
  prev: MenuFormState,
  formData: FormData,
): Promise<MenuFormState> {
  return run(eventId, prev, async (hostId) => {
    const db = await getDb();
    const dish = (await getMenu(db, hostId, eventId)).dishes.find((d) => d.dishId === dishId);
    if (!dish) throw new NotFoundError("Dish not found");

    const itemAmounts: Record<string, number> = {};
    for (const item of dish.recipe.items) {
      const raw = formData.get(`${AMOUNT_PREFIX}${item.id}`);
      if (raw === null) continue;
      // Boxes show amounts rounded to 4 places (1/3 lb is "0.3333"); an untouched box keeps the exact value.
      itemAmounts[item.id] =
        typeof raw === "string" && raw.trim() === formatAmount(item.perServing)
          ? item.perServing
          : parseNumber(raw);
    }
    await updateDish(db, hostId, eventId, dishId, {
      servingsPerPerson: parseNumber(formData.get(SERVINGS_FIELD)),
      itemAmounts,
    });
  });
}

export async function removeDishAction(
  eventId: string,
  dishId: string,
  prev: MenuFormState,
): Promise<MenuFormState> {
  return run(eventId, prev, async (hostId) => {
    await removeDish(await getDb(), hostId, eventId, dishId);
  });
}

function texts(formData: FormData, name: string): string[] {
  return formData.getAll(name).map((v) => (typeof v === "string" ? v : ""));
}

export async function createDishAction(
  eventId: string,
  prev: MenuFormState,
  formData: FormData,
): Promise<MenuFormState> {
  return run(eventId, prev, async (hostId) => {
    const columns = {
      name: texts(formData, F.itemName),
      emoji: texts(formData, F.itemEmoji),
      perServing: texts(formData, F.itemPerServing),
      unit: texts(formData, F.itemUnit),
      buyUnit: texts(formData, F.itemBuyUnit),
      unitsPerBuy: texts(formData, F.itemUnitsPerBuy),
      price: texts(formData, F.itemPrice),
    };
    const count = columns.name.length;
    if (Object.values(columns).some((c) => c.length !== count)) {
      throw new ValidationError("Something went wrong with the ingredient list. Try again.");
    }

    const items = columns.name.map((name, i) => {
      const priceCents = parseDollarsToCents(columns.price[i]);
      if (priceCents === null) {
        throw new ValidationError(`Price for "${name.trim()}" should look like 3.50`);
      }
      return {
        name,
        emoji: columns.emoji[i],
        perServing: parseNumber(columns.perServing[i]),
        unit: columns.unit[i],
        buyUnit: columns.buyUnit[i],
        unitsPerBuy: parseNumber(columns.unitsPerBuy[i]),
        priceCents,
      };
    });

    const db = await getDb();
    const { recipeId } = await createCustomRecipe(db, hostId, {
      name: String(formData.get(F.name) ?? ""),
      emoji: String(formData.get(F.emoji) ?? ""),
      defaultServingsPerPerson: parseNumber(formData.get(F.servings)),
      items,
    });
    await addDishToEvent(db, hostId, eventId, recipeId);
  });
}
