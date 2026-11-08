import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { RsvpForm } from "@/components/RsvpForm";
import { getDb } from "@/db/client";
import { formatWhen } from "@/lib/format";
import { guestCookieName } from "@/lib/guest-cookie";
import { NotFoundError } from "@/services/errors";
import { getGuestByToken, getPublicEvent } from "@/services/rsvp";
import { submitGuestRsvp } from "./actions";

// Reads cookies and the database, so it must never be prerendered.
export const dynamic = "force-dynamic";

export default async function GuestPage({ params }: PageProps<"/e/[code]">) {
  const { code } = await params;
  const db = await getDb();

  let event;
  try {
    event = await getPublicEvent(db, code);
  } catch (error) {
    if (error instanceof NotFoundError) notFound();
    throw error;
  }

  // A returning guest goes straight to their edit page. A missing, invalid or
  // stale cookie is ignored.
  const token = (await cookies()).get(guestCookieName(code))?.value;
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

  return (
    <main>
      <RsvpForm
        event={{
          title: event.title,
          when: formatWhen(event.startsAt, event.location),
          hostName: event.hostName,
          goingCount: event.goingCount,
        }}
        action={submitGuestRsvp.bind(null, code)}
      />
    </main>
  );
}
