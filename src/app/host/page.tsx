import Link from "next/link";
import { CopyLinkButton } from "@/components/CopyLinkButton";
import { CoverChip } from "@/components/CoverChip";
import { SignOutButton } from "@/components/SignOutButton";
import { EmptyState } from "@/components/EmptyState";
import { Bunting } from "@/components/scrapbook/Bunting";
import { Sticker } from "@/components/scrapbook/Sticker";
import {
  WashiTape,
  type WashiPattern,
  type WashiTone,
} from "@/components/scrapbook/WashiTape";
import { Pill } from "@/components/ui/Pill";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { Wordmark } from "@/components/ui/Wordmark";
import { getDb } from "@/db/client";
import { coverFor } from "@/lib/cover";
import { occasionFor, occasionSticker, type OccasionTheme } from "@/lib/occasion";
import { splitEventsByTime } from "@/lib/event-state";
import { formatWhen } from "@/lib/format";
import { countdownLabel } from "@/lib/relative-date";
import { requireHost } from "@/server/auth";
import { getBaseUrl, shareUrl } from "@/server/base-url";
import {
  findDeletedHostEvent,
  glanceForEvents,
  listHostEvents,
  purgeDeletedEvents,
  type EventGlance,
  type EventSummary,
} from "@/services/events";
import { restoreEventAction } from "./actions";

// Reads the session and the database, so it must never be prerendered.
export const dynamic = "force-dynamic";

/** Answer counts and the nudge, shown only on live upcoming cards. */
function GlanceLine({ countdown, glance }: { countdown: string | null; glance: EventGlance }) {
  const noReply =
    glance.noReply === 1 ? "1 hasn't replied" : `${glance.noReply} haven't replied`;
  return (
    <div className="dash-glance mt-2 flex items-center gap-1.5">
      {countdown ? <Pill tone="cream" compact>{countdown}</Pill> : null}
      <Pill tone="pickle" compact>{glance.yes} yes</Pill>
      <Pill tone="mustard" compact>{glance.maybe} maybe</Pill>
      <Pill tone="quiet" compact>{glance.no} no</Pill>
      {glance.noReply > 0 ? <Pill tone="quiet" compact>{noReply}</Pill> : null}
    </div>
  );
}

const WASHI_BY_THEME: Record<
  OccasionTheme,
  { pattern: WashiPattern; tone: WashiTone }
> = {
  party: { pattern: "stripe", tone: "mustard" },
  cookout: { pattern: "gingham", tone: "ketchup" },
  birthday: { pattern: "dots", tone: "ketchup" },
  pizzeria: { pattern: "gingham", tone: "ketchup" },
  fiesta: { pattern: "stripe", tone: "mustard" },
  toast: { pattern: "dots", tone: "mustard" },
  harvest: { pattern: "stripe", tone: "pickle" },
  holiday: { pattern: "gingham", tone: "pickle" },
  picnic: { pattern: "gingham", tone: "pickle" },
  brunch: { pattern: "dots", tone: "mustard" },
  gamenight: { pattern: "stripe", tone: "ketchup" },
};

const TAPE_POSITIONS = ["left", "center", "right"] as const;

/** Deterministic tape placement, so a row of tickets never lines up. */
function tapePosition(id: string): (typeof TAPE_POSITIONS)[number] {
  let hash = 0;
  for (const character of id) hash = (hash * 31 + character.charCodeAt(0)) % 997;
  return TAPE_POSITIONS[hash % TAPE_POSITIONS.length];
}

function EventTicket({
  event,
  baseUrl,
  glance,
  now,
  showGlance,
}: {
  event: EventSummary;
  baseUrl: string;
  glance?: EventGlance;
  now: Date;
  /** Upcoming and live only: past and cancelled cards stay quiet. */
  showGlance: boolean;
}) {
  const theme = occasionFor(event.coverEmoji);
  const tape = WASHI_BY_THEME[theme];
  const position = tapePosition(event.id);
  return (
    <li className="ticket dash-ticket">
      <WashiTape
        pattern={tape.pattern}
        tone={tape.tone}
        tilt={position === "center" ? 1 : position === "left" ? -4 : 4}
        className={`dash-tape dash-tape-${position}`}
      />
      <Sticker
        name={occasionSticker(theme)}
        size="md"
        className="dash-theme-sticker"
      />
      <div className="dash-ticket-head">
        <div className="flex min-w-0 items-start gap-3">
          <CoverChip cover={coverFor(event)} size="md" />
          <div className="min-w-0">
            <Link href={`/host/events/${encodeURIComponent(event.id)}`} className="block min-w-0">
              <span className="event-card-title">{event.title}</span>
              {event.cancelledAt ? (
                <span className="mt-2 inline-flex">
                  <Pill tone="quiet">Cancelled</Pill>
                </span>
              ) : null}
              <span className="event-card-meta">
                {formatWhen(event.startsAt, event.location, event.timezone)}
              </span>
            </Link>
            {showGlance ? (
              <GlanceLine
                countdown={countdownLabel(event.startsAt, event.timezone, now)}
                glance={glance ?? { yes: 0, maybe: 0, no: 0, noReply: 0 }}
              />
            ) : null}
          </div>
        </div>
        <p className="dash-ticket-count">
          <span className="ticket-count-label">Plan for </span>
          <span className="ticket-count-number">~{event.planFor}</span>
        </p>
      </div>
      <div className="dash-ticket-stub">
        <CopyLinkButton url={shareUrl(baseUrl, event.shareCode)} compact />
      </div>
    </li>
  );
}

export default async function HostDashboardPage({ searchParams }: PageProps<"/host">) {
  const host = await requireHost();
  const db = await getDb();
  // Lazy, host-scoped purge: anything deleted more than 30 days ago goes for good.
  await purgeDeletedEvents(db, host.id);
  const [events, baseUrl] = await Promise.all([listHostEvents(db, host.id), getBaseUrl()]);
  // One batched read for every card's answer counts; no per-event queries.
  const glance = await glanceForEvents(
    db,
    events.map((event) => event.id),
  );
  const now = new Date();

  // Set by deleteEventAction (the id, never the title): the notice stays until the
  // host follows the Dismiss link or Undo restores the event.
  const deleted = (await searchParams).deleted;
  const deletedId = typeof deleted === "string" && deleted.trim() ? deleted : null;
  const deletedEvent = deletedId ? await findDeletedHostEvent(db, host.id, deletedId) : null;

  const { upcoming, past } = splitEventsByTime(events);

  return (
    <main className="page-shell flex-1">
      <header className="site-top">
        <Wordmark />
        <SignOutButton />
      </header>

      <section className="dashboard-head-band">
        <Bunting count={18} className="dashboard-bunting" />
        <div className="dashboard-head-paper">
          <Sticker name="sun" size="sm" className="dashboard-head-sticker" />
          <div className="dashboard-head">
            <div>
              <h1 className="dashboard-title">Your events</h1>
              <p className="dashboard-sub">Hi, {host.name}.</p>
            </div>
          </div>
        </div>
      </section>

      {deletedEvent ? (
        <div
          role="status"
          className="ticket-surface mt-6 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-2xl bg-paper px-4 py-3"
        >
          <p className="text-sm font-semibold">
            Deleted <strong className="font-bold">“{deletedEvent.title}”</strong>.
          </p>
          <div className="flex items-center gap-4">
            <form action={restoreEventAction.bind(null, deletedEvent.id)}>
              <SubmitButton
                variant="outline"
                pendingLabel="Restoring..."
                className="min-h-11 px-3 py-2 text-sm"
              >
                Undo
              </SubmitButton>
            </form>
            <Link href="/host" className="quiet-link">
              Dismiss
            </Link>
          </div>
        </div>
      ) : null}

      {events.length === 0 ? (
        <EmptyState
          art="dashboard"
          title="No events yet"
          className="mt-8"
          action={
            <Link href="/host/new" className="cta-primary">
              Create event
            </Link>
          }
        >
          <p>Create an event, then share the link.</p>
        </EmptyState>
      ) : (
        <>
          {upcoming.length > 0 ? (
            <section aria-labelledby="upcoming-events">
              <h2 id="upcoming-events" className="mt-8 text-xl font-bold">
                Upcoming
              </h2>
              <ul className="event-list">
                {upcoming.map((event) => (
                  <EventTicket
                    key={event.id}
                    event={event}
                    baseUrl={baseUrl}
                    glance={glance.get(event.id)}
                    now={now}
                    showGlance={event.cancelledAt === null}
                  />
                ))}
              </ul>
            </section>
          ) : null}

          {past.length > 0 ? (
            <details className="mt-8">
              <summary className="cursor-pointer font-display text-xl text-ink">
                Past events ({past.length})
              </summary>
              <ul className="event-list">
                {past.map((event) => (
                  <EventTicket
                    key={event.id}
                    event={event}
                    baseUrl={baseUrl}
                    glance={glance.get(event.id)}
                    now={now}
                    showGlance={false}
                  />
                ))}
              </ul>
            </details>
          ) : null}

          <div className="mt-6">
            <Link href="/host/new" className="dashboard-create-link">
              <span aria-hidden="true">+</span> Create event
            </Link>
          </div>
        </>
      )}
    </main>
  );
}
