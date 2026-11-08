import { SplitPanel } from "@/components/split/SplitPanel";
import { getDb } from "@/db/client";
import { requireHost } from "@/server/auth";
import { loadHostEvent } from "@/server/host-event";
import { getSplitView } from "@/services/split";
import {
  markLinkSentAction,
  setAttendedAction,
  setExcludedAction,
  setHostCoverAction,
  setPaidAction,
  setVenmoUsernameAction,
} from "./actions";

// Reads the session and the database, so it must never be prerendered.
export const dynamic = "force-dynamic";

export default async function SplitTab({ params }: PageProps<"/host/events/[id]/split">) {
  // Layouts and pages are authorised independently: check ownership here too.
  const { event } = await loadHostEvent((await params).id);
  const host = await requireHost();
  const view = await getSplitView(await getDb(), host.id, event.id);

  return (
    <SplitPanel
      view={view}
      hostCoverCents={event.hostCoverCents}
      rowActions={Object.fromEntries(
        view.rows.map((row) => [
          row.guestId,
          {
            attendedAction: setAttendedAction.bind(null, event.id, row.guestId),
            excludedAction: setExcludedAction.bind(null, event.id, row.guestId),
            paidAction: setPaidAction.bind(null, event.id, row.guestId),
            linkSentAction: markLinkSentAction.bind(null, event.id, row.guestId),
          },
        ]),
      )}
      coverAction={setHostCoverAction.bind(null, event.id)}
      venmoAction={setVenmoUsernameAction.bind(null, event.id)}
    />
  );
}
