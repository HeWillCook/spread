import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CancelledEventNotice } from "@/components/CancelledEventNotice";
import { EventUnavailable } from "@/components/EventUnavailable";
import { RsvpForm } from "@/components/RsvpForm";
import { getDb } from "@/db/client";
import type { RsvpStatus } from "@/domain/headcount";
import { eventState } from "@/lib/event-state";
import { formatWhen } from "@/lib/format";
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

  const personalNote = (
    <p className="px-2 text-xs text-ink-muted">
      This is your personal link — don&apos;t share it.{" "}
      {cancelled ? null : (
        <Link
          href={`/e/${encodeURIComponent(code)}?new=1`}
          className="font-bold text-ketchup underline"
        >
          Not you? Answer as someone else
        </Link>
      )}
    </p>
  );

  return (
    <main>
      <RsvpForm
        event={{
          title: event.title,
          when: formatWhen(event.startsAt, event.location, event.timezone),
          hostName: event.hostName,
          goingCount: event.goingCount,
        }}
        initial={guest}
        action={updateGuestRsvp.bind(null, code, token)}
        readOnly={cancelled}
        notice={
          <div className="flex flex-col gap-2">
            {cancelled ? (
              <CancelledEventNotice hostName={event.hostName} />
            ) : (
              <div
                role="status"
                className="rounded-2xl bg-mustard px-5 py-4 text-lg font-bold text-ink"
              >
                {CONFIRMATION[guest.status]}
                <span className="block text-sm font-normal">
                  Need to change something? Update your answer below.
                </span>
              </div>
            )}
            {personalNote}
          </div>
        }
      />
    </main>
  );
}
