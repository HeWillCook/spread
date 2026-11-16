import { WhatIfPlanner } from "@/components/menu/WhatIfPlanner";
import { MenuPanel } from "@/components/menu/MenuPanel";
import { FoodNotesSummary } from "@/components/FoodNotesSummary";
import { getDb } from "@/db/client";
import { requireHost } from "@/server/auth";
import { loadHostEvent } from "@/server/host-event";
import { getMenu } from "@/services/menu";
import { getGuestsOverview } from "@/services/guestsOverview";
import {
  addDishAction,
  createDishAction,
  removeDishAction,
  updateDishAction,
} from "./actions";

// Reads the session and the database, so it must never be prerendered.
export const dynamic = "force-dynamic";

export default async function MenuTab({ params }: PageProps<"/host/events/[id]/menu">) {
  // Layouts and pages are authorised independently: check ownership here too.
  const { event } = await loadHostEvent((await params).id);
  const host = await requireHost();
  const db = await getDb();
  const [menu, overview] = await Promise.all([
    getMenu(db, host.id, event.id),
    getGuestsOverview(db, host.id, event.id),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <MenuPanel
        sheetHref={`/host/events/${encodeURIComponent(event.id)}/prep`}
        planningTools={
          <WhatIfPlanner
            key={`${overview.headcount.planFor}:${overview.headcount.low}:${overview.headcount.high}`}
            dishes={menu.dishes}
            headcount={overview.headcount}
            unansweredCount={overview.noReply?.length ?? 0}
          />
        }
        planFor={overview.headcount.planFor}
        dishes={menu.dishes.map((dish) => ({
          dish,
          updateAction: updateDishAction.bind(null, event.id, dish.dishId),
          removeAction: removeDishAction.bind(null, event.id, dish.dishId),
        }))}
        available={menu.available}
        addDishAction={addDishAction.bind(null, event.id)}
        createDishAction={createDishAction.bind(null, event.id)}
      />
      <FoodNotesSummary guests={overview.guests} />
    </div>
  );
}
