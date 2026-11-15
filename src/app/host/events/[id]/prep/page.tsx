import { KitchenSheet } from "@/components/prep/KitchenSheet";
import { getDb } from "@/db/client";
import { buildPrepSheet } from "@/lib/prep-sheet";
import { requireHost } from "@/server/auth";
import { loadHostEvent } from "@/server/host-event";
import { getGuestsOverview } from "@/services/guestsOverview";
import { getMenu } from "@/services/menu";

// Reads the session and the database, so it must never be prerendered.
export const dynamic = "force-dynamic";

export default async function PrepPage({ params }: { params: Promise<{ id: string }> }) {
  // Layouts and pages are authorised independently: check ownership here too.
  const { event } = await loadHostEvent((await params).id);
  const host = await requireHost();
  const db = await getDb();
  const [menu, overview] = await Promise.all([
    getMenu(db, host.id, event.id),
    getGuestsOverview(db, host.id, event.id),
  ]);

  const sheet = buildPrepSheet({
    event: {
      id: event.id,
      title: event.title,
      startsAt: event.startsAt,
      location: event.location,
      timezone: event.timezone,
    },
    dishes: menu.dishes,
    headcount: overview.headcount,
    guests: overview.guests,
  });

  return (
    <div className="flex flex-col gap-6">
      <KitchenSheet sheet={sheet} />
    </div>
  );
}
