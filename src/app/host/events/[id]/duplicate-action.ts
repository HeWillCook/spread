"use server";

import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";
import { getDb } from "@/db/client";
import { requireHost } from "@/server/auth";
import { NotFoundError } from "@/services/errors";
import { duplicateEvent } from "@/services/duplicate";

// The host comes from the session. The event id arrives through `bind`, which the
// browser can alter, so duplicateEvent re-checks that the event belongs to the host.

/** "Plan this again": copies the event's plan and opens the copy's edit page. */
export async function duplicateEventAction(eventId: string): Promise<void> {
  const host = await requireHost();
  let id: string;
  try {
    ({ id } = await duplicateEvent(await getDb(), host.id, eventId));
  } catch (error) {
    if (error instanceof NotFoundError) notFound();
    throw error;
  }
  revalidatePath("/host");
  redirect(`/host/events/${encodeURIComponent(id)}/edit`);
}
