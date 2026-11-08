import { GuestsPanel } from "@/components/GuestsPanel";
import { getDb } from "@/db/client";
import { requireHost } from "@/server/auth";
import { loadHostEvent } from "@/server/host-event";
import { getGuestsOverview } from "@/services/guestsOverview";
import { addInviteesAction, setMaybePercentAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function GuestsTab({ params }: PageProps<"/host/events/[id]">) {
  // Layouts and pages are authorised independently: check ownership here too.
  const { event } = await loadHostEvent((await params).id);
  const host = await requireHost();
  const overview = await getGuestsOverview(await getDb(), host.id, event.id);

  return (
    <GuestsPanel
      overview={overview}
      maybePercent={event.maybePercent}
      setMaybePercentAction={setMaybePercentAction.bind(null, event.id)}
      addInviteesAction={addInviteesAction.bind(null, event.id)}
    />
  );
}
