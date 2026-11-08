"use server";

import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";
import type { EditEventState } from "@/components/EditEventForm";
import { getDb } from "@/db/client";
import { requireHost } from "@/server/auth";
import { NotFoundError, ValidationError } from "@/services/errors";
import { updateEvent } from "@/services/events";

// The host comes from the session. The event id arrives through `bind`, but in Next 16
// bound arguments are sent to the browser and can be altered, so they are NOT protected:
// this is safe only because updateEvent re-checks that the event belongs to the host.

function text(formData: FormData, key: string): string {
  const v = formData.get(key);
  return typeof v === "string" ? v : "";
}

/** Saves the edited details, then returns to the Guests tab. */
export async function updateEventAction(
  eventId: string,
  _prev: EditEventState,
  formData: FormData,
): Promise<EditEventState> {
  const host = await requireHost();
  try {
    await updateEvent(await getDb(), host.id, eventId, {
      title: text(formData, "title"),
      startsAt: text(formData, "startsAt"),
      location: text(formData, "location"),
      timezone: text(formData, "timezone") || undefined,
    });
  } catch (error) {
    if (error instanceof ValidationError) return { error: error.message };
    if (error instanceof NotFoundError) notFound();
    throw error;
  }
  // The title and time show in the layout header and on the dashboard.
  revalidatePath(`/host/events/${encodeURIComponent(eventId)}`, "layout");
  revalidatePath("/host");
  redirect(`/host/events/${encodeURIComponent(eventId)}`);
}
