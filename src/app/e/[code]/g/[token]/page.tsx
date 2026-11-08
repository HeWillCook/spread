import { notFound } from "next/navigation";
import { RsvpForm } from "@/components/RsvpForm";
import { getDb } from "@/db/client";
import type { RsvpStatus } from "@/domain/headcount";
import { formatWhen } from "@/lib/format";
import { NotFoundError } from "@/services/errors";
import { getGuestByToken, getPublicEvent } from "@/services/rsvp";
import { updateGuestRsvp } from "../../actions";

// Reads the database, so it must never be prerendered.
export const dynamic = "force-dynamic";

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

  return (
    <main>
      <RsvpForm
        event={{
          title: event.title,
          when: formatWhen(event.startsAt, event.location),
          hostName: event.hostName,
          goingCount: event.goingCount,
        }}
        initial={guest}
        action={updateGuestRsvp.bind(null, code, token)}
        notice={
          <div
            role="status"
            className="rounded-xl border-2 border-ink bg-mustard px-4 py-3 text-base font-bold text-ink"
          >
            {CONFIRMATION[guest.status]}
            <span className="block text-sm font-normal">
              Need to change something? Update your answer below.
            </span>
          </div>
        }
      />
    </main>
  );
}
