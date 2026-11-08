import { MenuPanel } from "@/components/menu/MenuPanel";
import { getDb } from "@/db/client";
import { requireHost } from "@/server/auth";
import { loadHostEvent } from "@/server/host-event";
import { getMenu } from "@/services/menu";
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
  const menu = await getMenu(await getDb(), host.id, event.id);

  return (
    <MenuPanel
      dishes={menu.dishes.map((dish) => ({
        dish,
        updateAction: updateDishAction.bind(null, event.id, dish.dishId),
        removeAction: removeDishAction.bind(null, event.id, dish.dishId),
      }))}
      available={menu.available}
      addDishAction={addDishAction.bind(null, event.id)}
      createDishAction={createDishAction.bind(null, event.id)}
    />
  );
}
