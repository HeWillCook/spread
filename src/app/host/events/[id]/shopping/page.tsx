import { ShoppingPanel } from "@/components/shopping/ShoppingPanel";
import { getDb } from "@/db/client";
import { biggestLine, rangeNote } from "@/lib/shopping-text";
import { requireHost } from "@/server/auth";
import { loadHostEvent } from "@/server/host-event";
import { getMenu } from "@/services/menu";
import { getShoppingPlan } from "@/services/shopping";
import {
  addExtraCostAction,
  removeExtraCostAction,
  setActualCostAction,
  setCheckedAction,
} from "./actions";

// Reads the session and the database, so it must never be prerendered.
export const dynamic = "force-dynamic";

export default async function ShoppingTab({ params }: PageProps<"/host/events/[id]/shopping">) {
  // Layouts and pages are authorised independently: check ownership here too.
  const { event } = await loadHostEvent((await params).id);
  const host = await requireHost();
  const db = await getDb();
  const [plan, menu] = await Promise.all([
    getShoppingPlan(db, host.id, event.id),
    getMenu(db, host.id, event.id),
  ]);

  const biggest = biggestLine(plan.lines);
  const note = biggest
    ? rangeNote(menu.dishes, plan.headcount, biggest.itemId, biggest.buyUnit)
    : null;

  return (
    <ShoppingPanel
      plan={plan}
      rangeNote={note}
      lineActions={Object.fromEntries(
        plan.lines.map((line) => [
          line.itemId,
          {
            checkAction: setCheckedAction.bind(null, event.id, line.itemId),
            priceAction: setActualCostAction.bind(null, event.id, line.itemId),
          },
        ]),
      )}
      extras={plan.extras.map((extra) => ({
        extra,
        removeAction: removeExtraCostAction.bind(null, event.id, extra.id),
      }))}
      addExtraAction={addExtraCostAction.bind(null, event.id)}
    />
  );
}
