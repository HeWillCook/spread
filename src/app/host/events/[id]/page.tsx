import { ComingSoon } from "@/components/ComingSoon";
import { loadHostEvent } from "@/server/host-event";

export const dynamic = "force-dynamic";

// Placeholder: the Guests tab is filled in by a later task.
export default async function GuestsTab({ params }: PageProps<"/host/events/[id]">) {
  await loadHostEvent((await params).id);
  return <ComingSoon what="Guests" />;
}
