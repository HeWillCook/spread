"use client";

import { useActionState, useState } from "react";
import { formatCents } from "@/domain/money";
import { buildShoppingList } from "@/domain/shopping";
import { formatBuyQty } from "@/lib/shopping-text";
import {
  amountLabel,
  appetiteLabel,
  buyHint,
  formatAmount,
  formatIngredientAmount,
  servingWord,
  timeRow,
  totalTimeLabel,
} from "@/lib/menu-text";
import { amountField, dishAnchorId, SERVINGS_FIELD } from "@/lib/menu-fields";
import type { MenuDish } from "@/services/menu";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { Field } from "../ui/Field";
import { Pill } from "../ui/Pill";
import { FormError, INITIAL_MENU_FORM_STATE, type MenuFormAction } from "./menuForm";

function RemoveForm({ action, name }: { action: MenuFormAction; name: string }) {
  const [state, formAction, pending] = useActionState(action, INITIAL_MENU_FORM_STATE);
  return (
    <form action={formAction} className="flex flex-col gap-2">
      <FormError message={state.error} />
      <Button variant="outline" type="submit" disabled={pending}>
        {pending ? "Removing..." : `Remove ${name} from the menu`}
      </Button>
    </form>
  );
}

/** "Ground beef, Burger buns, Cheese slices +2 more" for the collapsed card. */
function ingredientSummary(items: { name: string }[]): string {
  const shown = items.slice(0, 3).map((item) => item.name);
  const rest = items.length - shown.length;
  return rest > 0 ? `${shown.join(", ")} +${rest} more` : shown.join(", ");
}

/**
 * One dish on the menu. Collapsed by default it shows the essentials; expanding reveals
 * the portion form and the recipe's how-to-make-it text. Expansion is owned by the parent
 * (MenuPanel) so it survives the re-key that follows a save.
 */
export function DishCard({
  dish,
  updateAction,
  removeAction,
  planFor,
  expanded,
  onToggle,
}: {
  dish: MenuDish;
  updateAction: MenuFormAction;
  removeAction: MenuFormAction;
  planFor?: number;
  expanded: boolean;
  onToggle: () => void;
}) {
  const { recipe } = dish;
  const prep =
    planFor === undefined
      ? []
      : buildShoppingList([{ recipe, servingsPerPerson: dish.servingsPerPerson }], planFor);
  const [state, formAction, pending] = useActionState(updateAction, INITIAL_MENU_FORM_STATE);
  // Controlled so a rejected save keeps what the host typed (React resets uncontrolled forms).
  const [servings, setServings] = useState(formatAmount(dish.servingsPerPerson));
  const [amounts, setAmounts] = useState<Record<string, string>>(() =>
    Object.fromEntries(recipe.items.map((i) => [i.id, formatAmount(i.perServing)])),
  );

  // A rejected save has to be visible, so an error forces the card open.
  const open = expanded || state.error !== null;
  const panelId = `dish-panel-${dish.dishId}`;

  const steps = recipe.steps ?? [];
  const tips = recipe.tips ?? [];
  const equipment = recipe.equipment ?? [];
  const times = timeRow(recipe);
  const totalTime = totalTimeLabel(recipe);
  const servingsMade = prep[0]?.servings ?? 0;
  const estCostCents = prep.reduce((sum, line) => sum + line.estCostCents, 0);

  return (
    <div
      id={dishAnchorId(dish.dishId)}
      tabIndex={-1}
      className="scroll-mt-24 focus:outline-none"
    >
      <Card className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-1">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <h2 className="min-w-0 truncate text-xl font-bold leading-tight">
                <span aria-hidden="true">{recipe.emoji}</span> {recipe.name}
              </h2>
              {dish.isStarter ? (
                <Pill tone="cream">Starter recipe</Pill>
              ) : recipe.category ? (
                <Pill tone="cream">{recipe.category}</Pill>
              ) : null}
            </div>

            <p className="text-sm font-bold text-ink/85">
              {formatAmount(dish.servingsPerPerson)} {appetiteLabel(recipe.name)}
              {planFor !== undefined && planFor > 0
                ? ` · ${formatBuyQty(servingsMade, servingWord(recipe.name))} for ${planFor} ${
                    planFor === 1 ? "guest" : "guests"
                  }`
                : ""}
            </p>

            <p className="flex flex-wrap items-baseline gap-x-2 text-xs text-ink/75">
              {totalTime ? <span className="font-bold">{totalTime}</span> : null}
              {planFor !== undefined && planFor > 0 ? (
                <span>
                  About {formatCents(estCostCents)} for {planFor}{" "}
                  {planFor === 1 ? "guest" : "guests"} ·{" "}
                  {formatCents(Math.round(estCostCents / planFor))} per person
                </span>
              ) : null}
            </p>

            <p className="line-clamp-2 text-xs text-ink/70">{ingredientSummary(recipe.items)}</p>
          </div>

          <Button
            variant="outline"
            aria-expanded={open}
            aria-controls={panelId}
            onClick={onToggle}
            className="shrink-0"
          >
            {open ? "Hide details" : "Edit details"}
          </Button>
        </div>

        <div id={panelId} hidden={!open}>
          {open ? (
            <div className="flex flex-col gap-4 border-t border-dashed border-divider pt-3">
              {planFor !== undefined ? (
                <section
                  aria-label={`${recipe.name} prep quantities`}
                  className="border-b border-divider pb-4"
                >
                  <h3 className="mb-3 text-lg font-bold">
                    {formatBuyQty(servingsMade, servingWord(recipe.name))} for ~{planFor} people
                  </h3>
                  {planFor === 0 ? (
                    <p className="mb-3 text-sm text-ink/80">
                      Quantities will appear as guests RSVP. You can set up your portions now.
                    </p>
                  ) : null}
                  <dl className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-2 text-sm">
                    {prep.map((line) => (
                      <div key={line.itemId} className="contents">
                        <dt>{line.name}</dt>
                        <dd className="text-right font-bold tabular-nums">
                          {formatBuyQty(Number(line.needed.toFixed(2)), line.neededUnit)}
                        </dd>
                      </div>
                    ))}
                  </dl>
                  <p className="mt-3 text-xs leading-relaxed text-ink/80">
                    Shopping rounds up to whole packs.
                  </p>
                </section>
              ) : null}

              <details className="rounded-xl border-[1.5px] border-dashed border-divider">
                <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-3 py-2 text-base font-bold">
                  <span>How to make it</span>
                  <span className="text-xs font-semibold text-ink/70">
                    {steps.length > 0 ? `${steps.length} steps` : "No steps yet"}
                  </span>
                </summary>
                <div className="flex flex-col gap-4 border-t border-dashed border-divider px-3 py-3 text-sm leading-relaxed">
                  {recipe.description ? <p className="text-ink/85">{recipe.description}</p> : null}
                  {times ? <p className="font-bold text-ink/85">{times}</p> : null}
                  {equipment.length > 0 ? (
                    <p className="text-ink/85">
                      <span className="font-bold">Equipment: </span>
                      {equipment.join(" · ")}
                    </p>
                  ) : null}
                  {steps.length > 0 ? (
                    <ol className="flex list-decimal flex-col gap-2 pl-5 marker:font-bold marker:text-ketchup">
                      {steps.map((step, index) => (
                        <li key={`${index}-${step.slice(0, 24)}`}>{step}</li>
                      ))}
                    </ol>
                  ) : (
                    <p className="text-ink/70">
                      No instructions yet.
                      {dish.isStarter
                        ? null
                        : " Add steps the next time you create your own dish."}
                    </p>
                  )}
                  {tips.length > 0 ? (
                    <div>
                      <h3 className="font-bold">Tips</h3>
                      <ul className="mt-1 flex list-disc flex-col gap-1 pl-5">
                        {tips.map((tip, index) => (
                          <li key={`${index}-${tip.slice(0, 24)}`}>{tip}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  {planFor !== undefined && planFor > 0 && prep.length > 0 ? (
                    <div>
                      <h3 className="font-bold">You&apos;ll need</h3>
                      <ul className="mt-1 flex flex-col gap-1">
                        {prep.map((line) => (
                          <li
                            key={line.itemId}
                            className="flex items-baseline justify-between gap-3"
                          >
                            <span className="min-w-0">{line.name}</span>
                            <span className="shrink-0 font-bold tabular-nums">
                              {formatIngredientAmount(line.needed, line.neededUnit)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
              </details>

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
                          hint={buyHint(item, formatCents(item.priceCents))}
                          name={amountField(item.id)}
                          type="number"
                          inputMode="decimal"
                          min={0}
                          step="any"
                          value={amounts[item.id] ?? ""}
                          onChange={(e) =>
                            setAmounts((a) => ({ ...a, [item.id]: e.target.value }))
                          }
                          required
                        />
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-xs leading-relaxed text-ink/70">
                  0 skips an ingredient.
                </p>
                <FormError message={state.error} />
                <Button variant="red" type="submit" disabled={pending}>
                  {pending ? "Saving..." : `Save ${recipe.name}`}
                </Button>
              </form>
            </div>
          ) : null}
        </div>

        <RemoveForm action={removeAction} name={recipe.name} />
      </Card>
    </div>
  );
}
