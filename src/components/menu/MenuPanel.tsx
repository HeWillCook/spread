import type { Recipe } from "@/domain/recipes";
import type { MenuDish } from "@/services/menu";
import { Card } from "../ui/Card";
import { AddDishPanel } from "./AddDishPanel";
import { CustomDishForm } from "./CustomDishForm";
import { DishCard } from "./DishCard";
import type { MenuFormAction } from "./menuForm";

export interface MenuDishWithActions {
  dish: MenuDish;
  /** Already bound to this event and dish on the server. */
  updateAction: MenuFormAction;
  removeAction: MenuFormAction;
}

export function MenuPanel({
  dishes,
  available,
  addDishAction,
  createDishAction,
}: {
  dishes: MenuDishWithActions[];
  available: Recipe[];
  addDishAction: MenuFormAction;
  createDishAction: MenuFormAction;
}) {
  return (
    <div className="flex flex-col gap-4">
      {dishes.length === 0 ? (
        <Card>
          <h2 className="text-lg font-bold">What are you serving?</h2>
          <p className="text-sm text-ink/80">Nothing on the menu yet. Add a dish below.</p>
        </Card>
      ) : (
        dishes.map(({ dish, updateAction, removeAction }) => (
          <DishCard
            // Re-key when the saved values change so the inputs start from the server's numbers.
            key={`${dish.dishId}:${dish.recipe.id}:${dish.servingsPerPerson}:${dish.recipe.items
              .map((i) => i.perServing)
              .join(",")}`}
            dish={dish}
            updateAction={updateAction}
            removeAction={removeAction}
          />
        ))
      )}
      <AddDishPanel recipes={available} action={addDishAction} />
      <CustomDishForm action={createDishAction} />
    </div>
  );
}
