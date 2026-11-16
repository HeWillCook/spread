import { CancelEventSection } from "@/components/CancelEventSection";
import { DeleteEventSection } from "@/components/DeleteEventSection";
import { EditEventForm } from "@/components/EditEventForm";
import { dateToZonedLocal } from "@/lib/zoned-time";
import { loadHostEvent } from "@/server/host-event";
import {
  cancelEventAction,
  deleteEventAction,
  uncancelEventAction,
  updateEventAction,
} from "./actions";

// Reads the session and the database, so it must never be prerendered.
export const dynamic = "force-dynamic";

export default async function EditEventPage({ params }: PageProps<"/host/events/[id]/edit">) {
  // Layouts and pages are authorised independently: check ownership here too.
  const { event } = await loadHostEvent((await params).id);
  const cancelled = event.cancelledAt !== null;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
      <div className="flex min-w-0 max-w-xl flex-col gap-3">
        <h2 className="text-xl font-bold">Edit details</h2>
        <EditEventForm
          initial={{
            title: event.title,
            startsAt: dateToZonedLocal(event.startsAt, event.timezone),
            location: event.location,
            timezone: event.timezone,
            coverEmoji: event.coverEmoji,
            coverColor: event.coverColor,
          }}
          action={updateEventAction.bind(null, event.id)}
          backHref={`/host/events/${encodeURIComponent(event.id)}`}
        />
      </div>
      <aside className="flex min-w-0 flex-col gap-3 lg:sticky lg:top-[4.25rem] lg:self-start">
        <CancelEventSection
          cancelled={cancelled}
          action={
            cancelled
              ? uncancelEventAction.bind(null, event.id)
              : cancelEventAction.bind(null, event.id)
          }
        />
        <DeleteEventSection
          title={event.title}
          action={deleteEventAction.bind(null, event.id)}
        />
      </aside>
    </div>
  );
}
