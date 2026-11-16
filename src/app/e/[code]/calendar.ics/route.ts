import { getDb } from "@/db/client";
import { buildIcs, icsFilename } from "@/lib/ics";
import { baseUrlFrom, shareUrl } from "@/server/base-url";
import { getCalendarEvent } from "@/services/calendar";
import { NotFoundError } from "@/services/errors";

// Reads the database, so it must never be prerendered or cached.
export const dynamic = "force-dynamic";

/**
 * `/e/[code]/calendar.ics` downloads the event as an iCalendar file.
 * Unknown and deleted events are a plain 404; cancelled events download with
 * STATUS:CANCELLED.
 */
export async function GET(
  request: Request,
  context: RouteContext<"/e/[code]/calendar.ics">,
): Promise<Response> {
  const { code } = await context.params;
  const db = await getDb();

  let event;
  try {
    event = await getCalendarEvent(db, code);
  } catch (error) {
    if (error instanceof NotFoundError) {
      return new Response("Event not found", { status: 404 });
    }
    throw error;
  }

  const url = shareUrl(
    baseUrlFrom(new Headers(request.headers), process.env.BETTER_AUTH_URL),
    event.shareCode,
  );
  const ics = buildIcs({
    id: event.id,
    title: event.title,
    startsAt: event.startsAt,
    location: event.location,
    hostName: event.hostName,
    url,
    cancelled: event.cancelled,
  });

  return new Response(ics, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${icsFilename(event.title)}"`,
    },
  });
}
