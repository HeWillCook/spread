import Link from "next/link";
import { CopyLinkButton } from "@/components/CopyLinkButton";
import { Card } from "@/components/ui/Card";
import { Pill } from "@/components/ui/Pill";
import { Wordmark } from "@/components/ui/Wordmark";
import { getDb } from "@/db/client";
import { formatWhen } from "@/lib/format";
import { requireHost } from "@/server/auth";
import { getBaseUrl, shareUrl } from "@/server/base-url";
import { listHostEvents } from "@/services/events";

// Reads the session and the database, so it must never be prerendered.
export const dynamic = "force-dynamic";

const createLinkClass =
  "inline-flex min-h-12 items-center justify-center rounded-xl border-2 border-ink bg-mustard px-5 py-3 text-base font-bold text-ink transition-transform active:translate-y-px";

export default async function HostDashboardPage() {
  const host = await requireHost();
  const [events, baseUrl] = await Promise.all([
    getDb().then((db) => listHostEvents(db, host.id)),
    getBaseUrl(),
  ]);

  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-5 p-5">
      <Wordmark />
      <header className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold leading-tight text-ink">Your cookouts</h1>
        <p className="text-sm text-ink/80">Hi, {host.name}.</p>
      </header>

      <Link href="/host/new" className={createLinkClass}>
        Create event
      </Link>

      {events.length === 0 ? (
        <Card>
          <p className="text-base text-ink">
            No cookouts yet. Create one and share the link with your guests.
          </p>
        </Card>
      ) : (
        <ul className="flex flex-col gap-4">
          {events.map((event) => (
            <li key={event.id}>
              <Card className="flex flex-col gap-3">
                <div className="flex items-start justify-between gap-3">
                  <Link
                    href={`/host/events/${encodeURIComponent(event.id)}`}
                    className="flex min-w-0 flex-col gap-1"
                  >
                    <span className="text-xl font-bold leading-tight text-ink">{event.title}</span>
                    <span className="text-sm text-ink/80">
                      {formatWhen(event.startsAt, event.location, event.timezone)}
                    </span>
                  </Link>
                  <Pill>{event.planFor} coming</Pill>
                </div>
                <CopyLinkButton url={shareUrl(baseUrl, event.shareCode)} />
              </Card>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
