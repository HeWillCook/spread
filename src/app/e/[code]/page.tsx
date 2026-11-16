import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { CancelledEventNotice } from "@/components/CancelledEventNotice";
import { EventUnavailable } from "@/components/EventUnavailable";
import { RsvpForm } from "@/components/RsvpForm";
import { getDb } from "@/db/client";
import { eventState } from "@/lib/event-state";
import { formatWhen } from "@/lib/format";
import { guestCookieName } from "@/lib/guest-cookie";
import { eventPreview, wantsBlankForm } from "@/lib/guest-page";
import { calendarDetails, googleCalendarUrl } from "@/lib/ics";
import { getBaseUrl, shareUrl } from "@/server/base-url";
import { NotFoundError } from "@/services/errors";
import { getGuestByToken, getPublicEvent } from "@/services/rsvp";
import { submitGuestRsvp } from "./actions";

// Reads cookies and the database, so it must never be prerendered.
export const dynamic = "force-dynamic";

/** Per-event title and description for chat link previews (public event fields only). */
export async function generateMetadata({ params }: PageProps<"/e/[code]">): Promise<Metadata> {
  const { code } = await params;
  const event = await getPublicEvent(await getDb(), code).catch((error) => {
    if (error instanceof NotFoundError) return null;
    throw error;
  });
  // A deleted event must not keep advertising its title in link previews.
  const { title, description } = eventPreview(event && !event.deletedAt ? event : null);
  return { title, description, openGraph: { title, description } };
}

export default async function GuestPage({ params, searchParams }: PageProps<"/e/[code]">) {
  const { code } = await params;
  const blank = wantsBlankForm(await searchParams);
  const db = await getDb();

  let event;
  try {
    event = await getPublicEvent(db, code);
  } catch (error) {
    if (error instanceof NotFoundError) notFound();
    throw error;
  }

  const state = eventState(event);
  if (state === "deleted") return <EventUnavailable hostName={event.hostName} />;
  const cancelled = state === "cancelled";

  // A returning guest goes straight to their edit page. A missing, invalid or
  // stale cookie is ignored. `?new=1` ("Not you?") skips this and shows a blank form.
  const token = blank ? undefined : (await cookies()).get(guestCookieName(code))?.value;
  if (token) {
    const known = await getGuestByToken(db, code, token).then(
      () => true,
      (error) => {
        if (error instanceof NotFoundError) return false;
        throw error;
      },
    );
    if (known) redirect(`/e/${encodeURIComponent(code)}/g/${encodeURIComponent(token)}`);
  }

  const guestUrl = shareUrl(await getBaseUrl(), code);
  const googleUrl = googleCalendarUrl({
    title: event.title,
    startsAt: event.startsAt,
    location: event.location,
    details: calendarDetails(event.hostName, guestUrl),
  });

  return (
    <main>
      <RsvpForm
        event={{
          title: event.title,
          when: formatWhen(event.startsAt, event.location, event.timezone),
          hostName: event.hostName,
          goingCount: event.goingCount,
        }}
        action={submitGuestRsvp.bind(null, code)}
        readOnly={cancelled}
        notice={cancelled ? <CancelledEventNotice hostName={event.hostName} /> : undefined}
      />

      <aside className="mx-auto -mt-6 w-full max-w-lg px-3 pb-14 sm:px-5">
        <div className="ticket-surface rounded-2xl border border-divider bg-paper p-4">
          <h2 className="text-base font-bold text-ink">Add to calendar</h2>
          <p className="mt-1 text-sm leading-relaxed text-ink/80">
            Save the time now. Come back to this link if plans change.
          </p>
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
            <a href={`/e/${encodeURIComponent(code)}/calendar.ics`} className="quiet-link">
              Download .ics
            </a>
            <a
              href={googleUrl}
              target="_blank"
              rel="noreferrer"
              className="quiet-link"
            >
              Google Calendar
            </a>
          </div>
        </div>
      </aside>
    </main>
  );
}
