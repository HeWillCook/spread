import Link from "next/link";
import type { ReactNode } from "react";
import { CancelledEventNotice } from "@/components/CancelledEventNotice";
import { CopyCancellationButton } from "@/components/CopyCancellationButton";
import { CoverChip } from "@/components/CoverChip";
import { EventTabs } from "@/components/EventTabs";
import { EventTopBar } from "@/components/event/EventTopBar";
import { OccasionScene } from "@/components/occasion/OccasionScene";
import { Sticker } from "@/components/scrapbook/Sticker";
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
  const inviteUrl = shareUrl(baseUrl, event.shareCode);

  return (
    <div className="event-shell">
      <EventTopBar
        eventId={event.id}
        title={event.title}
        cover={coverFor(event)}
        planFor={planFor}
        confirmed={confirmed}
        shareUrl={inviteUrl}
        cancelled={event.cancelledAt !== null}
        accent={occasionAccent(theme)}
        duplicateAction={duplicateEventAction.bind(null, event.id)}
      />

      {/* Desktop keeps the full order ticket; phones use the compact bar above. */}
      <header className="event-masthead">
        <div className="event-top">
          <Link href="/host" aria-label="All my events" className="wordmark-link">
            <Wordmark />
          </Link>
          <Link href="/host" className="quiet-link">
            All events
          </Link>
        </div>

        <div className="ticket event-ticket">
          <div className="event-scene" aria-hidden="true">
            <span className="event-scene-inner">
              <OccasionScene theme={theme} size="strip" />
            </span>
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
        </div>
      </header>

      {event.cancelledAt ? (
        <div className="event-cancelled">
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

      <main className="event-main">
        <EventTabs eventId={event.id} accent={occasionAccent(theme)} />
        {children}
      </main>
    </div>
  );
}
