"use server";

import { redirect } from "next/navigation";
import type { NewEventState } from "@/components/NewEventForm";
import { getDb } from "@/db/client";
import { zonedLocalToDate } from "@/lib/zoned-time";
import { requireHost } from "@/server/auth";
import { ValidationError } from "@/services/errors";
import { createEvent } from "@/services/events";

function text(formData: FormData, key: string): string {
  const v = formData.get(key);
  return typeof v === "string" ? v : "";
}

/** Creates the event for the signed-in host, then opens its Guests tab. */
export async function createEventAction(
  _prev: NewEventState,
  formData: FormData,
): Promise<NewEventState> {
  const host = await requireHost();

  let id: string;
  try {
    // The date/time is the host's wall-clock time in their browser's zone.
    const startsAt = zonedLocalToDate(text(formData, "startsAt"), text(formData, "timezone"));
    ({ id } = await createEvent(await getDb(), host.id, {
      title: text(formData, "title"),
      location: text(formData, "location"),
      hostName: host.name,
      startsAt,
      timezone: text(formData, "timezone"),
      coverEmoji: text(formData, "coverEmoji") || null,
      coverColor: text(formData, "coverColor") || null,
    }));
  } catch (error) {
    if (error instanceof ValidationError) return { error: error.message };
    throw error;
  }
  redirect(`/host/events/${encodeURIComponent(id)}`);
}
