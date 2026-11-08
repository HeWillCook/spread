"use server";

import { revalidatePath } from "next/cache";
import { notFound } from "next/navigation";
import type { GuestsFormState } from "@/components/GuestsPanel";
import { getDb } from "@/db/client";
import { requireHost } from "@/server/auth";
import { NotFoundError, ValidationError } from "@/services/errors";
import { addInvitees } from "@/services/events";
import { setMaybePercent } from "@/services/guestsOverview";

/** Re-renders the tab and the layout's "N coming" pill. */
function refresh(eventId: string) {
  revalidatePath(`/host/events/${encodeURIComponent(eventId)}`, "layout");
}

/** Whole numbers only; anything else becomes NaN for the service to reject. */
function parsePercent(value: FormDataEntryValue | null): number {
  if (typeof value !== "string" || !/^\s*\d{1,3}\s*$/.test(value)) return Number.NaN;
  return Number(value);
}

/** Saves how many maybes to plan for. The host comes from the session, never the form. */
export async function setMaybePercentAction(
  eventId: string,
  _prev: GuestsFormState,
  formData: FormData,
): Promise<GuestsFormState> {
  const host = await requireHost();
  try {
    await setMaybePercent(await getDb(), host.id, eventId, parsePercent(formData.get("percent")));
  } catch (error) {
    if (error instanceof ValidationError) return { error: error.message };
    if (error instanceof NotFoundError) notFound();
    throw error;
  }
  refresh(eventId);
  return { error: null };
}

/** Adds pasted invitee names (one per line) for the "no reply" list. */
export async function addInviteesAction(
  eventId: string,
  _prev: GuestsFormState,
  formData: FormData,
): Promise<GuestsFormState> {
  const host = await requireHost();
  const raw = formData.get("names");
  const names = typeof raw === "string" ? raw.split(/\r?\n/) : [];
  try {
    await addInvitees(await getDb(), host.id, eventId, names);
  } catch (error) {
    if (error instanceof ValidationError) return { error: error.message };
    if (error instanceof NotFoundError) notFound();
    throw error;
  }
  refresh(eventId);
  return { error: null };
}
