import Link from "next/link";
import { CopyLinkButton } from "@/components/CopyLinkButton";
import { SignOutButton } from "@/components/SignOutButton";
import { Card } from "@/components/ui/Card";
import { Wordmark } from "@/components/ui/Wordmark";
import { getDb } from "@/db/client";
import { formatWhen } from "@/lib/format";
import { requireHost } from "@/server/auth";
import { getBaseUrl, shareUrl } from "@/server/base-url";
import { listHostEvents } from "@/services/events";

// Reads the session and the database, so it must never be prerendered.
export const dynamic = "force-dynamic";

export default async function HostDashboardPage() {
  const host = await requireHost();
  const [events, baseUrl] = await Promise.all([
    getDb().then((db) => listHostEvents(db, host.id)),
    getBaseUrl(),
  ]);

  return (
    <main className="page-shell flex-1">
      <header className="site-top">
        <Wordmark />
        <SignOutButton />
      </header>

      <div className="dashboard-head">
        <div>
          <h1 className="dashboard-title">Your cookouts</h1>
          <p className="dashboard-sub">
            Hi, {host.name}. Pick an event to keep planning.
          </p>
        </div>
        <Link href="/host/new" className="cta-primary">
          Create event
        </Link>
      </div>

      {events.length === 0 ? (
        <div className="mt-8 max-w-2xl">
          <Card className="flex flex-col gap-2">
            <h2 className="text-xl font-bold">No cookouts yet</h2>
            <p className="text-sm leading-relaxed text-ink-muted">
              Create one, then share the link with your guests. Replies start
              filling in the food plan.
            </p>
          </Card>
        </div>
      ) : (
        <ul className="event-list">
          {events.map((event) => (
            <li key={event.id} className="ticket dash-ticket">
              <div className="dash-ticket-head">
                <Link
                  href={`/host/events/${encodeURIComponent(event.id)}`}
                  className="min-w-0"
                >
                  <span className="event-card-title">{event.title}</span>
                  <span className="event-card-meta">
                    {formatWhen(event.startsAt, event.location, event.timezone)}
                  </span>
                </Link>
                <p className="dash-ticket-count">
                  <span className="ticket-count-label">Plan for </span>
                  <span className="ticket-count-number">~{event.planFor}</span>
                </p>
              </div>
              <div className="dash-ticket-stub">
                <CopyLinkButton url={shareUrl(baseUrl, event.shareCode)} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
