import Link from "next/link";
import type { ReactNode } from "react";
import { CancelledEventNotice } from "@/components/CancelledEventNotice";
import { CopyCancellationButton } from "@/components/CopyCancellationButton";
import { CopyLinkButton } from "@/components/CopyLinkButton";
import { CoverChip } from "@/components/CoverChip";
import { EventTabs } from "@/components/EventTabs";
import { OccasionScene } from "@/components/occasion/OccasionScene";
import { Sticker } from "@/components/scrapbook/Sticker";
import { WashiTape } from "@/components/scrapbook/WashiTape";
import { Wordmark } from "@/components/ui/Wordmark";
import { coverFor } from "@/lib/cover";
import { occasionAccent, occasionFor, occasionSticker } from "@/lib/occasion";
import { formatWhen } from "@/lib/format";
import { getBaseUrl, shareUrl } from "@/server/base-url";
import { loadHostEvent } from "@/server/host-event";
import { duplicateEventAction } from "./duplicate-action";

// Reads the session and the database, so it must never be prerendered.
export const dynamic = "force-dynamic";

export default async function EventLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [{ event, planFor, confirmed }, baseUrl] = await Promise.all([
    loadHostEvent(id),
    getBaseUrl(),
  ]);
  const theme = occasionFor(event.coverEmoji);

  return (
    <div className="event-shell">
      <header className="event-masthead">
        <div className="event-top">
          <Link href="/host" aria-label="All my events" className="wordmark-link">
            <Wordmark />
          </Link>
          <Link href="/host" className="quiet-link">
            All events
          </Link>
        </div>

        {event.cancelledAt ? (
          <div className="mb-4">
            <CancelledEventNotice>
              <p className="text-sm leading-relaxed text-ink-muted">
                Guests see this event as cancelled and can&apos;t RSVP. Everything is still here,
                so you can reinstate it from Edit details.
              </p>
              <div className="mt-1">
                <CopyCancellationButton
                  title={event.title}
                  when={formatWhen(event.startsAt, "", event.timezone)}
                />
              </div>
            </CancelledEventNotice>
          </div>
        ) : null}

        <div className="ticket event-ticket">
          <div className="event-scene" aria-hidden="true">
            <OccasionScene theme={theme} size="strip" />
            <Sticker
              name={occasionSticker(theme)}
              size="sm"
              className="event-scene-sticker"
            />
          </div>
          <div className="event-heading">
            <div className="flex min-w-0 items-start gap-3">
              <CoverChip cover={coverFor(event)} size="lg" className="mt-1" />
              <div className="min-w-0">
                <h1 className="event-title">{event.title}</h1>
                <p className="event-meta">
                  {formatWhen(event.startsAt, event.location, event.timezone)}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-x-5">
                  <Link
                    href={`/host/events/${encodeURIComponent(event.id)}/edit`}
                    className="quiet-link"
                  >
                    Edit details
                  </Link>
                  <form action={duplicateEventAction.bind(null, event.id)}>
                    <button type="submit" className="quiet-link">
                      Plan this again
                    </button>
                  </form>
                </div>
              </div>
            </div>
            <div className="ticket-count">
              <p>
                <span className="ticket-count-label">Plan for </span>
                <span className="ticket-count-number">~{planFor}</span>
              </p>
              <p className="ticket-count-sub">with {confirmed} confirmed</p>
            </div>
          </div>

          {/* A cancelled event takes no RSVPs, so don't invite anyone to it. */}
          {event.cancelledAt ? null : (
            <section className="event-invite" aria-labelledby="invite-title">
              <span className="event-invite-tape event-invite-tape-left" aria-hidden="true">
                <WashiTape pattern="gingham" tone="mustard" tilt={-4} />
              </span>
              <span className="event-invite-tape event-invite-tape-right" aria-hidden="true">
                <WashiTape pattern="stripe" tone="pickle" tilt={3} />
              </span>
              <div>
                <h2 id="invite-title">Invite your guests</h2>
                <p>Guests RSVP from this link. No account needed.</p>
              </div>
              <CopyLinkButton url={shareUrl(baseUrl, event.shareCode)} />
            </section>
          )}
        </div>
      </header>

      <main className="event-main">
        <div className="event-tabs">
          <EventTabs eventId={event.id} accent={occasionAccent(theme)} />
        </div>
        {children}
      </main>
    </div>
  );
}
