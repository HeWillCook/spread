"use server";

import { revalidatePath } from "next/cache";
import { notFound } from "next/navigation";
import type { SplitFormState } from "@/components/split/splitForm";
import { getDb } from "@/db/client";
import { parseDollarsToCents } from "@/domain/money";
import { requireHost } from "@/server/auth";
import { NotFoundError, ValidationError } from "@/services/errors";
import {
  markLinkSent,
  setAttended,
  setExcluded,
  setHostCover,
  setPaid,
  setVenmoUsername,
} from "@/services/split";

// Every action here takes the host from the session and the event/guest ids from
// server-side `bind`; only the typed values come from the form.

function refresh(eventId: string) {
  revalidatePath(`/host/events/${encodeURIComponent(eventId)}`, "layout");
}

/** Runs a service call: friendly message for bad input, 404 for someone else's data. */
async function run(
  eventId: string,
  prev: SplitFormState,
  work: (hostId: string) => Promise<void>,
): Promise<SplitFormState> {
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

// An unticked checkbox sends nothing, so presence of the field is the value.
const ticked = (formData: FormData, field: string) => formData.get(field) !== null;

export async function setAttendedAction(
  eventId: string,
  guestId: string,
  prev: SplitFormState,
  formData: FormData,
): Promise<SplitFormState> {
  const value = ticked(formData, "attended");
  return run(eventId, prev, async (hostId) => {
    await setAttended(await getDb(), hostId, eventId, guestId, value);
  });
}

export async function setExcludedAction(
  eventId: string,
  guestId: string,
  prev: SplitFormState,
  formData: FormData,
): Promise<SplitFormState> {
  const value = ticked(formData, "excluded");
  return run(eventId, prev, async (hostId) => {
    await setExcluded(await getDb(), hostId, eventId, guestId, value);
  });
}

export async function setPaidAction(
  eventId: string,
  guestId: string,
  prev: SplitFormState,
  formData: FormData,
): Promise<SplitFormState> {
  const value = ticked(formData, "paid");
  return run(eventId, prev, async (hostId) => {
    await setPaid(await getDb(), hostId, eventId, guestId, value);
  });
}

export async function markLinkSentAction(
  eventId: string,
  guestId: string,
  prev: SplitFormState,
): Promise<SplitFormState> {
  return run(eventId, prev, async (hostId) => {
    await markLinkSent(await getDb(), hostId, eventId, guestId);
  });
}

export async function setHostCoverAction(
  eventId: string,
  prev: SplitFormState,
  formData: FormData,
): Promise<SplitFormState> {
  const raw = formData.get("cover");
  return run(eventId, prev, async (hostId) => {
    // Blank means the host covers nothing.
    const cents = typeof raw === "string" && raw.trim() === "" ? 0 : parseCover(raw);
    await setHostCover(await getDb(), hostId, eventId, cents);
  });
}

function parseCover(raw: FormDataEntryValue | null): number {
  const cents = typeof raw === "string" ? parseDollarsToCents(raw) : null;
  if (cents === null) throw new ValidationError("Amount should look like 10.00");
  return cents;
}

export async function setVenmoUsernameAction(
  eventId: string,
  prev: SplitFormState,
  formData: FormData,
): Promise<SplitFormState> {
  const raw = formData.get("username");
  return run(eventId, prev, async (hostId) => {
    await setVenmoUsername(await getDb(), hostId, eventId, typeof raw === "string" ? raw : null);
  });
}
