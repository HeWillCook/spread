import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { CancelledEventNotice } from "@/components/CancelledEventNotice";
import { CoverChip } from "@/components/CoverChip";
import { EventUnavailable } from "@/components/EventUnavailable";
import { ScrapbookPage } from "@/components/ScrapbookPage";
import { RsvpForm } from "@/components/RsvpForm";
import { UpdatedDetailsNotice } from "@/components/UpdatedDetailsNotice";
import { getDb } from "@/db/client";
import { coverFor } from "@/lib/cover";
import { eventState } from "@/lib/event-state";
import { formatWhen } from "@/lib/format";
import { occasionFor } from "@/lib/occasion";
import { guestCookieName } from "@/lib/guest-cookie";
import { eventPreview, wantsBlankForm } from "@/lib/guest-page";
import { calendarDetails, googleCalendarUrl } from "@/lib/ics";
import { changedRecently, relativeDateLabel } from "@/lib/relative-date";
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

  // Anonymous visitors have no RSVP date to compare with, so a recent move
  // shows for two weeks. Cancelled events keep the cancellation banner instead.
  const now = new Date();
  const changedAt = cancelled ? null : event.detailsChangedAt;
  const updated = changedAt && changedRecently(changedAt, now)
    ? {
        relative: relativeDateLabel(changedAt, now, event.timezone),
        when: formatWhen(event.startsAt, "", event.timezone),
        location: event.location,
      }
    : null;

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

  const theme = occasionFor(event.coverEmoji);
  const guestUrl = shareUrl(await getBaseUrl(), code);
  const googleUrl = googleCalendarUrl({
    title: event.title,
    startsAt: event.startsAt,
    location: event.location,
    details: calendarDetails(event.hostName, guestUrl),
  });

  return (
    <ScrapbookPage
      variant="occasion"
      theme={theme}
      cover={<CoverChip cover={coverFor(event)} size="lg" />}
      headline={event.title}
      detail={
        <>
          <p>{formatWhen(event.startsAt, event.location, event.timezone)}</p>
          <p>Hosted by {event.hostName}</p>
        </>
      }
    >
      <RsvpForm
        event={{
          title: event.title,
          when: formatWhen(event.startsAt, event.location, event.timezone),
          hostName: event.hostName,
          goingCount: event.goingCount,
          cover: coverFor(event),
        }}
        action={submitGuestRsvp.bind(null, code)}
        readOnly={cancelled}
        hideTitle
        notice={
          cancelled ? (
            <CancelledEventNotice hostName={event.hostName} />
          ) : updated ? (
            <UpdatedDetailsNotice {...updated} />
          ) : undefined
        }
      />

      {cancelled ? null : (
        <aside className="ticket-surface rounded-2xl border border-divider bg-paper p-4">
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
        </aside>
      )}
    </ScrapbookPage>
  );
}
