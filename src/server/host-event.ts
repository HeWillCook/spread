import { cache } from "react";
import { notFound } from "next/navigation";
import { getDb } from "@/db/client";
import { NotFoundError } from "@/services/errors";
import { getHostEvent, headcountForEvents, type EventRow } from "@/services/events";
import { requireHost } from "./auth";

/**
 * The signed-in host's event, or notFound() if it is someone else's or missing.
 * Every page under /host/events/[id] must call this itself: layouts and pages
 * render independently, so the layout's check does not protect a page.
 */
export const loadHostEvent = cache(
  async (eventId: string): Promise<{ event: EventRow; planFor: number }> => {
    const host = await requireHost();
    const db = await getDb();
    try {
      const event = await getHostEvent(db, host.id, eventId);
      const headcount = (await headcountForEvents(db, [event.id])).get(event.id);
      return { event, planFor: headcount?.planFor ?? 0 };
    } catch (error) {
      if (error instanceof NotFoundError) notFound();
      throw error;
    }
  },
);
