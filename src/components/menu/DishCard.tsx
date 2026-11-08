"use client";

import { useActionState, useState } from "react";
import { formatCents } from "@/domain/money";
import { amountField, SERVINGS_FIELD } from "@/lib/menu-fields";
import { amountLabel, appetiteLabel, formatAmount } from "@/lib/menu-text";
import type { MenuDish } from "@/services/menu";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { Field } from "../ui/Field";
import { Pill } from "../ui/Pill";
import { FormError, INITIAL_MENU_FORM_STATE, type MenuFormAction } from "./menuForm";

function RemoveForm({ action, name }: { action: MenuFormAction; name: string }) {
  const [state, formAction, pending] = useActionState(action, INITIAL_MENU_FORM_STATE);
  return (
    <form action={formAction} className="flex flex-col gap-3">
      <FormError message={state.error} />
      <Button variant="outline" type="submit" disabled={pending}>
        {pending ? "Removing..." : `Remove ${name} from the menu`}
      </Button>
    </form>
  );
}

/**
 * One dish on the menu: appetite plus per-item amounts. The parent re-keys this
 * component when the saved values change, so the local text state always starts
 * from what the server has.
 */
export function DishCard({
  dish,
  updateAction,
  removeAction,
}: {
  dish: MenuDish;
  updateAction: MenuFormAction;
  removeAction: MenuFormAction;
}) {
  const { recipe } = dish;
  const [state, formAction, pending] = useActionState(updateAction, INITIAL_MENU_FORM_STATE);
  // Controlled so a rejected save keeps what the host typed (React resets uncontrolled forms).
  const [servings, setServings] = useState(formatAmount(dish.servingsPerPerson));
  const [amounts, setAmounts] = useState<Record<string, string>>(() =>
    Object.fromEntries(recipe.items.map((i) => [i.id, formatAmount(i.perServing)])),
  );

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-xl font-bold leading-tight">
          <span aria-hidden="true">{recipe.emoji}</span> {recipe.name}
        </h2>
        {dish.isStarter ? <Pill tone="cream">Starter recipe</Pill> : null}
      </div>
      {dish.isStarter ? (
        <p className="text-xs text-ink/70">
          Change an amount and we save your own copy. The starter recipe stays as it is.
        </p>
      ) : null}

      <form action={formAction} className="flex flex-col gap-4">
        <Field
          label={appetiteLabel(recipe.name)}
          name={SERVINGS_FIELD}
          type="number"
          inputMode="decimal"
          min={0}
          max={20}
          step="any"
          value={servings}
          onChange={(e) => setServings(e.target.value)}
          required
        />
        <div className="flex flex-col">
          {recipe.items.map((item) => (
            <div
              key={item.id}
              className="flex items-end gap-3 border-t-2 border-dashed border-divider py-3 first:border-t-0 last:pb-0"
            >
              <span aria-hidden="true" className="pb-2 text-3xl leading-none">
                {item.emoji}
              </span>
              <div className="min-w-0 flex-1">
                <Field
                  label={`${item.name} (${amountLabel(item.unit, recipe.name)})`}
                  hint={`Buy by the ${item.buyUnit}: ${formatAmount(item.unitsPerBuy)} ${item.unit}, ${formatCents(item.priceCents)}`}
                  name={amountField(item.id)}
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step="any"
                  value={amounts[item.id] ?? ""}
                  onChange={(e) => setAmounts((a) => ({ ...a, [item.id]: e.target.value }))}
                  required
                />
              </div>
            </div>
          ))}
        </div>
        <FormError message={state.error} />
        <Button variant="red" type="submit" disabled={pending}>
          {pending ? "Saving..." : `Save ${recipe.name}`}
        </Button>
      </form>

      <RemoveForm action={removeAction} name={recipe.name} />
    </Card>
  );
}
