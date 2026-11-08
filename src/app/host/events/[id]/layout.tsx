import Link from "next/link";
import type { ReactNode } from "react";
import { EventTabs } from "@/components/EventTabs";
import { Pill } from "@/components/ui/Pill";
import { Wordmark } from "@/components/ui/Wordmark";
import { formatWhen } from "@/lib/format";
import { loadHostEvent } from "@/server/host-event";

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
  const { event, planFor } = await loadHostEvent(id);

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-4 p-5">
      <header className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <Link href="/host" aria-label="All my events">
            <Wordmark />
          </Link>
          <Pill>{planFor} coming</Pill>
        </div>
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold leading-tight text-ink">{event.title}</h1>
          <p className="text-sm text-ink/80">
            {formatWhen(event.startsAt, event.location, event.timezone)}
          </p>
          <Link
            href={`/host/events/${encodeURIComponent(event.id)}/edit`}
            className="self-start text-sm font-bold text-ketchup underline"
          >
            Edit details
          </Link>
        </div>
      </header>
      <EventTabs eventId={event.id} />
      <main>{children}</main>
    </div>
  );
}
