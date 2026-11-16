import { DeleteEventSection } from "@/components/DeleteEventSection";
import { EditEventForm } from "@/components/EditEventForm";
import { dateToZonedLocal } from "@/lib/zoned-time";
import { loadHostEvent } from "@/server/host-event";
import { deleteEventAction, updateEventAction } from "./actions";

// Reads the session and the database, so it must never be prerendered.
export const dynamic = "force-dynamic";

export default async function EditEventPage({ params }: PageProps<"/host/events/[id]/edit">) {
  // Layouts and pages are authorised independently: check ownership here too.
  const { event } = await loadHostEvent((await params).id);

  return (
    <div className="flex max-w-xl flex-col gap-3">
      <h2 className="text-xl font-bold">Edit details</h2>
      <EditEventForm
        initial={{
          title: event.title,
          startsAt: dateToZonedLocal(event.startsAt, event.timezone),
          location: event.location,
          timezone: event.timezone,
        }}
        action={updateEventAction.bind(null, event.id)}
        backHref={`/host/events/${encodeURIComponent(event.id)}`}
      />
      <DeleteEventSection
        title={event.title}
        action={deleteEventAction.bind(null, event.id)}
      />
    </div>
  );
}
