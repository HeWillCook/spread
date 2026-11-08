"use server";

import { revalidatePath } from "next/cache";
import { notFound } from "next/navigation";
import type { ShoppingFormState } from "@/components/shopping/shoppingForm";
import { getDb } from "@/db/client";
import { parseDollarsToCents } from "@/domain/money";
import { requireHost } from "@/server/auth";
import { NotFoundError, ValidationError } from "@/services/errors";
import { addExtraCost, removeExtraCost, setActualCost, setChecked } from "@/services/shopping";

// Every action here takes the host from the session. The event/ingredient/extra ids arrive
// through `bind`, but in Next 16 bound arguments are sent to the browser and can be altered,
// so they are NOT protected: these actions are safe only because every service re-checks
// that the event (and its child rows) belong to the signed-in host.

/** Re-renders the tabs that depend on the shopping total (Split reads it too). */
function refresh(eventId: string) {
  revalidatePath(`/host/events/${encodeURIComponent(eventId)}`, "layout");
}

/** Runs a service call: friendly message for bad input, 404 for someone else's data. */
async function run(
  eventId: string,
  prev: ShoppingFormState,
  work: (hostId: string) => Promise<void>,
): Promise<ShoppingFormState> {
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

/** Dollars from a text box, or a ValidationError the host can act on. */
function dollars(raw: FormDataEntryValue | null, problem: string): number {
  const cents = typeof raw === "string" ? parseDollarsToCents(raw) : null;
  if (cents === null) throw new ValidationError(problem);
  return cents;
}

export async function setCheckedAction(
  eventId: string,
  recipeItemId: string,
  prev: ShoppingFormState,
  formData: FormData,
): Promise<ShoppingFormState> {
  // An unticked checkbox sends nothing.
  const checked = formData.get("checked") !== null;
  return run(eventId, prev, async (hostId) => {
    await setChecked(await getDb(), hostId, eventId, recipeItemId, checked);
  });
}

export async function setActualCostAction(
  eventId: string,
  recipeItemId: string,
  prev: ShoppingFormState,
  formData: FormData,
): Promise<ShoppingFormState> {
  const raw = formData.get("price");
  return run(eventId, prev, async (hostId) => {
    // Blank goes back to the estimate.
    const cents =
      typeof raw === "string" && raw.trim() === "" ? null : dollars(raw, "Price should look like 3.50");
    await setActualCost(await getDb(), hostId, eventId, recipeItemId, cents);
  });
}

export async function addExtraCostAction(
  eventId: string,
  prev: ShoppingFormState,
  formData: FormData,
): Promise<ShoppingFormState> {
  const label = formData.get("label");
  return run(eventId, prev, async (hostId) => {
    const cents = dollars(formData.get("amount"), "Amount should look like 8.00");
    await addExtraCost(await getDb(), hostId, eventId, typeof label === "string" ? label : "", cents);
  });
}

export async function removeExtraCostAction(
  eventId: string,
  extraId: string,
  prev: ShoppingFormState,
): Promise<ShoppingFormState> {
  return run(eventId, prev, async (hostId) => {
    await removeExtraCost(await getDb(), hostId, eventId, extraId);
  });
}
