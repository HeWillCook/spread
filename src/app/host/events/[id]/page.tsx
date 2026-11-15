import { GuestsPanel } from "@/components/GuestsPanel";
import { DevGuestTools } from "@/components/dev/DevGuestTools";
import { getDb } from "@/db/client";
import { devToolsEnabled } from "@/server/dev-tools";
import { requireHost } from "@/server/auth";
import { loadHostEvent } from "@/server/host-event";
import { getBaseUrl, shareUrl } from "@/server/base-url";
import { getGuestsOverview } from "@/services/guestsOverview";
import { listDevGuestLinks } from "@/services/devGuests";
import {
  addDevCrowdAction,
  addDevGuestAction,
  addDevSampleAction,
  clearDevGuestsAction,
} from "./dev-actions";
import { addInviteesAction, removeGuestAction, setMaybePercentAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function GuestsTab({ params }: PageProps<"/host/events/[id]">) {
  // Layouts and pages are authorised independently: check ownership here too.
  const { event } = await loadHostEvent((await params).id);
  const host = await requireHost();
  const db = await getDb();
  const overview = await getGuestsOverview(db, host.id, event.id);
  const baseUrl = await getBaseUrl();
  const devLinks = devToolsEnabled()
    ? await listDevGuestLinks(db, host.id, event.id, event.shareCode, baseUrl)
    : [];

  return (
    <>
      <GuestsPanel
        overview={overview}
        invitation={{ title: event.title, url: shareUrl(baseUrl, event.shareCode) }}
        maybePercent={event.maybePercent}
        setMaybePercentAction={setMaybePercentAction.bind(null, event.id)}
        addInviteesAction={addInviteesAction.bind(null, event.id)}
        removeGuestAction={removeGuestAction.bind(null, event.id)}
      />
      {devToolsEnabled() ? (
        <DevGuestTools
          addGuestAction={addDevGuestAction.bind(null, event.id)}
          addSampleAction={addDevSampleAction.bind(null, event.id)}
          addCrowdAction={addDevCrowdAction.bind(null, event.id)}
          clearAction={clearDevGuestsAction.bind(null, event.id)}
          links={devLinks}
        />
      ) : null}
    </>
  );
}
