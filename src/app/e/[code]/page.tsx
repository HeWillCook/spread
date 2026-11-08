import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { RsvpForm } from "@/components/RsvpForm";
import { getDb } from "@/db/client";
import { formatWhen } from "@/lib/format";
import { guestCookieName } from "@/lib/guest-cookie";
import { eventPreview, wantsBlankForm } from "@/lib/guest-page";
import { NotFoundError } from "@/services/errors";
import { getGuestByToken, getPublicEvent } from "@/services/rsvp";
import { submitGuestRsvp } from "./actions";

// Reads cookies and the database, so it must never be prerendered.
export const dynamic = "force-dynamic";

/** Per-event title and description for chat link previews (public event fields only). */
export async function generateMetadata({ params }: PageProps<"/e/[code]">): Promise<Metadata> {
  const { code } = await params;
  const event = await getPublicEvent(await getDb(), code).catch((error) => {
    if (error instanceof NotFoundError) return null;
    throw error;
  });
  const { title, description } = eventPreview(event);
  return { title, description, openGraph: { title, description } };
}

export default async function GuestPage({ params, searchParams }: PageProps<"/e/[code]">) {
  const { code } = await params;
  const blank = wantsBlankForm(await searchParams);
  const db = await getDb();

  let event;
  try {
    event = await getPublicEvent(db, code);
  } catch (error) {
    if (error instanceof NotFoundError) notFound();
    throw error;
  }

  // A returning guest goes straight to their edit page. A missing, invalid or
  // stale cookie is ignored. `?new=1` ("Not you?") skips this and shows a blank form.
  const token = blank ? undefined : (await cookies()).get(guestCookieName(code))?.value;
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
          when: formatWhen(event.startsAt, event.location, event.timezone),
          hostName: event.hostName,
          goingCount: event.goingCount,
        }}
        action={submitGuestRsvp.bind(null, code)}
      />
    </main>
  );
}
