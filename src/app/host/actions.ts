"use server";

import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";
import { getDb } from "@/db/client";
import { requireHost } from "@/server/auth";
import { NotFoundError } from "@/services/errors";
import { restoreEvent } from "@/services/events";

// The host comes from the session; the event id arrives through `bind` and is
// therefore untrusted. restoreEvent re-checks that the event is this host's and
// deleted before it comes back.

/** Undo on the dashboard's "Deleted …" notice: restores the event, then opens it. */
export async function restoreEventAction(eventId: string): Promise<void> {
  const host = await requireHost();
  try {
    await restoreEvent(await getDb(), host.id, eventId);
  } catch (error) {
    if (error instanceof NotFoundError) notFound();
    throw error;
  }
  revalidatePath("/host");
  revalidatePath(`/host/events/${encodeURIComponent(eventId)}`, "layout");
  redirect(`/host/events/${encodeURIComponent(eventId)}`);
}
