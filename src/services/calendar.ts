import { and, eq, isNull } from "drizzle-orm";
import type { Db } from "@/db/client";
import { events } from "@/db/schema";
import { NotFoundError } from "./errors";

/** The public fields a calendar file needs. Deleted events never resolve. */
export interface CalendarEvent {
  id: string;
  shareCode: string;
  title: string;
  startsAt: Date;
  location: string;
  hostName: string;
  cancelled: boolean;
}

/**
 * The event behind a share code, with the cancelled flag folded in.
 * A soft-deleted event is a NotFoundError: its calendar link must 404.
 */
export async function getCalendarEvent(db: Db, shareCode: string): Promise<CalendarEvent> {
  const [event] = await db
    .select()
    .from(events)
    .where(and(eq(events.shareCode, shareCode), isNull(events.deletedAt)));
  if (!event) throw new NotFoundError("Event not found");
  return {
    id: event.id,
    shareCode: event.shareCode,
    title: event.title,
    startsAt: event.startsAt,
    location: event.location,
    hostName: event.hostName,
    cancelled: event.cancelledAt !== null,
  };
}
