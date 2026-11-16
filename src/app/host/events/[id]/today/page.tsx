import { TodayChecklist } from "@/components/today/TodayChecklist";
import { getDb } from "@/db/client";
import { buildPrepSheet } from "@/lib/prep-sheet";
import { buildTodayPlan } from "@/lib/today-plan";
import { requireHost } from "@/server/auth";
import { loadHostEvent } from "@/server/host-event";
import { getGuestsOverview } from "@/services/guestsOverview";
import { getMenu } from "@/services/menu";
import { getShoppingPlan } from "@/services/shopping";

// Reads the session and the database, so it must never be prerendered.
export const dynamic = "force-dynamic";

export default async function TodayTab({ params }: PageProps<"/host/events/[id]/today">) {
  // Layouts and pages are authorised independently: check ownership here too.
  const { event } = await loadHostEvent((await params).id);
  const host = await requireHost();
  const db = await getDb();
  const [shopping, menu, overview] = await Promise.all([
    getShoppingPlan(db, host.id, event.id),
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

  const plan = buildTodayPlan({
    event: {
      id: event.id,
      title: event.title,
      startsAt: event.startsAt,
      timezone: event.timezone,
    },
    shopping: shopping.lines,
    prepSheet: sheet,
  });

  return <TodayChecklist plan={plan} />;
}
