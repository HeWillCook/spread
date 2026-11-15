"use server";

import { revalidatePath } from "next/cache";
import { getDb } from "@/db/client";
import { requireHost } from "@/server/auth";
import { devToolsEnabled } from "@/server/dev-tools";
import { addDevCrowd, addDevGuest, addDevSampleSet, clearDevGuests } from "@/services/devGuests";
import type { DevFormState } from "@/lib/dev-form";

/**
 * Everything here is local-development tooling. The page only mounts the panel in
 * `next dev`, and each action re-checks the env so a stray server action call in a
 * production build does nothing.
 */
function disabled(): DevFormState {
  return { error: "Developer tools are only available with `npm run dev`.", message: null };
}

function fail(error: unknown): DevFormState {
  return {
    error: error instanceof Error ? error.message : "Something went wrong",
    message: null,
  };
}

function plusOnesFrom(raw: FormDataEntryValue | null): string[] {
  if (typeof raw !== "string") return [];
  return raw
    .split(/[\n,]+/)
    .map((name) => name.trim())
    .filter((name) => name.length > 0);
}

export async function addDevGuestAction(
  eventId: string,
  _prev: DevFormState,
  formData: FormData,
): Promise<DevFormState> {
  if (!devToolsEnabled()) return disabled();
  try {
    const host = await requireHost();
    const name = String(formData.get("name") ?? "").trim() || `Dev Guest ${Date.now() % 1000}`;
    const status = String(formData.get("status") ?? "yes");
    if (status !== "yes" && status !== "maybe" && status !== "no") {
      return { error: "Pick yes, maybe or no", message: null };
    }
    await addDevGuest(await getDb(), host.id, eventId, {
      name,
      status,
      plusOneNames: plusOnesFrom(formData.get("plusOnes")),
      foodNotes: String(formData.get("foodNotes") ?? ""),
      attended: formData.get("attended") === "on",
      paid: formData.get("paid") === "on",
      excluded: formData.get("excluded") === "on",
    });
    revalidatePath(`/host/events/${eventId}`);
    return { error: null, message: `Added ${name}` };
  } catch (error) {
    return fail(error);
  }
}

export async function addDevCrowdAction(
  eventId: string,
  _prev: DevFormState,
  formData: FormData,
): Promise<DevFormState> {
  if (!devToolsEnabled()) return disabled();
  try {
    const host = await requireHost();
    const count = Number(formData.get("count") ?? 0);
    const { added } = await addDevCrowd(await getDb(), host.id, eventId, count);
    revalidatePath(`/host/events/${eventId}`);
    return { error: null, message: `Added ${added} guests` };
  } catch (error) {
    return fail(error);
  }
}

export async function addDevSampleAction(eventId: string): Promise<DevFormState> {
  if (!devToolsEnabled()) return disabled();
  try {
    const host = await requireHost();
    const { added } = await addDevSampleSet(await getDb(), host.id, eventId);
    revalidatePath(`/host/events/${eventId}`);
    return { error: null, message: `Added ${added} guests` };
  } catch (error) {
    return fail(error);
  }
}

export async function clearDevGuestsAction(eventId: string): Promise<DevFormState> {
  if (!devToolsEnabled()) return disabled();
  try {
    const host = await requireHost();
    const { removed } = await clearDevGuests(await getDb(), host.id, eventId);
    revalidatePath(`/host/events/${eventId}`);
    return { error: null, message: `Removed ${removed} guests` };
  } catch (error) {
    return fail(error);
  }
}
