import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CancelledEventNotice } from "@/components/CancelledEventNotice";
import { CoverChip } from "@/components/CoverChip";
import { EventUnavailable } from "@/components/EventUnavailable";
import { ScrapbookPage } from "@/components/ScrapbookPage";
import { RsvpForm } from "@/components/RsvpForm";
import { UpdatedDetailsNotice } from "@/components/UpdatedDetailsNotice";
import { OccasionBurst } from "@/components/occasion/OccasionBurst";
import { Sticker } from "@/components/scrapbook/Sticker";
import { getDb } from "@/db/client";
import type { RsvpStatus } from "@/domain/headcount";
import { coverFor } from "@/lib/cover";
import { eventState } from "@/lib/event-state";
import { formatWhen } from "@/lib/format";
import { occasionFor, occasionHero, occasionSticker } from "@/lib/occasion";
import { relativeDateLabel } from "@/lib/relative-date";
import { NotFoundError } from "@/services/errors";
import { getGuestByToken, getPublicEvent } from "@/services/rsvp";
import { updateGuestRsvp } from "../../actions";

// Reads the database, so it must never be prerendered.
export const dynamic = "force-dynamic";

// The URL is a personal secret: keep it out of search results and out of Referer headers.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

const CONFIRMATION: Record<RsvpStatus, string> = {
  yes: "You're in!",
  maybe: "Got it, maybe",
  no: "Sorry you can't make it",
};

export default async function GuestEditPage({ params }: PageProps<"/e/[code]/g/[token]">) {
  const { code, token } = await params;
  const db = await getDb();

  let event;
  let guest;
  try {
    [event, guest] = await Promise.all([
      getPublicEvent(db, code),
      getGuestByToken(db, code, token),
    ]);
  } catch (error) {
    if (error instanceof NotFoundError) notFound();
    throw error;
  }

  const state = eventState(event);
  if (state === "deleted") return <EventUnavailable hostName={event.hostName} />;
  const cancelled = state === "cancelled";

  // A returning guest only needs the notice if the move happened after they
  // answered; cancellation has its own banner.
  const now = new Date();
  const changedAt = cancelled ? null : event.detailsChangedAt;
  const updated =
    changedAt && changedAt.getTime() > guest.createdAt.getTime()
      ? {
          relative: relativeDateLabel(changedAt, now, event.timezone),
          when: formatWhen(event.startsAt, "", event.timezone),
          location: event.location,
        }
      : null;

  const theme = occasionFor(event.coverEmoji);

  const personalNote = (
    <p className="px-2 text-xs text-ink-muted">
      This is your personal link — don&apos;t share it.{" "}
      {cancelled ? null : (
        <Link
          href={`/e/${encodeURIComponent(code)}?new=1`}
          className="inline-flex min-h-11 items-center font-bold text-ketchup underline"
        >
          Not you? Answer as someone else
        </Link>
      )}
    </p>
  );

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
        initial={guest}
        action={updateGuestRsvp.bind(null, code, token)}
        readOnly={cancelled}
        hideTitle
        notice={
          <div className="flex flex-col gap-2">
            {cancelled ? (
              <CancelledEventNotice hostName={event.hostName} />
            ) : (
              <div
                role="status"
                className="success-banner rounded-2xl bg-mustard px-5 py-4 text-lg font-bold text-ink"
              >
                <OccasionBurst theme={theme} />
                <Sticker
                  name={occasionHero(theme)}
                  size="lg"
                  peel
                  delay={0.15}
                  className="success-hero"
                />
                <div className="success-banner-copy">
                  <span className="flex items-center gap-2">
                    <Sticker name={occasionSticker(theme)} size="sm" />
                    {CONFIRMATION[guest.status]}
                  </span>
                  <span className="mt-0.5 block text-sm font-normal">
                    Need to change something? Update your answer below.
                  </span>
                </div>
              </div>
            )}
            {updated ? <UpdatedDetailsNotice {...updated} /> : null}
            {personalNote}
          </div>
        }
      />
    </ScrapbookPage>
  );
}
