"use server";

import { revalidatePath } from "next/cache";
import { notFound } from "next/navigation";
import type { SplitFormState } from "@/components/split/splitForm";
import { getDb } from "@/db/client";
import { parseDollarsToCents } from "@/domain/money";
import { requireHost } from "@/server/auth";
import { NotFoundError, ValidationError } from "@/services/errors";
import { addWalkIn } from "@/services/guestAdmin";
import {
  markLinkSent,
  setAttended,
  setExcluded,
  setHostCover,
  setPaid,
  setVenmoUsername,
} from "@/services/split";

// Every action here takes the host from the session. The event/guest ids arrive through
// `bind`, but in Next 16 bound arguments are sent to the browser and can be altered, so
// they are NOT protected: these actions are safe only because every service re-checks
// that the event (and guest) belongs to the signed-in host.

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
  formData: FormData,
): Promise<SplitFormState> {
  const raw = formData.get("amountCents");
  return run(eventId, prev, async (hostId) => {
    // The browser sends the amount it actually put in the shared message.
    const text = typeof raw === "string" ? raw.trim() : "";
    if (!/^\d+$/.test(text)) throw new ValidationError("Amount is missing or invalid");
    await markLinkSent(await getDb(), hostId, eventId, guestId, Number(text));
  });
}

/** Adds someone who came without RSVPing; blank extra people means none. */
export async function addWalkInAction(
  eventId: string,
  prev: SplitFormState,
  formData: FormData,
): Promise<SplitFormState> {
  const name = formData.get("name");
  const extra = formData.get("plusOnes");
  return run(eventId, prev, async (hostId) => {
    const raw = typeof extra === "string" ? extra.trim() : "";
    // Anything that isn't a plain whole number becomes NaN for the service to reject.
    const plusOnes = raw === "" ? 0 : /^\d{1,3}$/.test(raw) ? Number(raw) : Number.NaN;
    await addWalkIn(await getDb(), hostId, eventId, {
      name: typeof name === "string" ? name : "",
      plusOnes,
    });
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
