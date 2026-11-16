import Link from "next/link";
import type { ReactNode } from "react";
import type { Recipe } from "@/domain/recipes";
import type { MenuDish } from "@/services/menu";
import { EmptyState } from "../EmptyState";
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
  planFor,
  planningTools,
  sheetHref,
}: {
  dishes: MenuDishWithActions[];
  available: Recipe[];
  addDishAction: MenuFormAction;
  createDishAction: MenuFormAction;
  planFor?: number;
  planningTools?: ReactNode;
  sheetHref?: string;
}) {
  return (
    <div className="flex flex-col gap-6">
      <header className="menu-heading">
        <div className="flex flex-col gap-2">
          <h2 className="text-2xl font-bold">What&apos;s on the table?</h2>
          <p className="max-w-prose text-sm leading-relaxed text-ink/80">Choose your dishes and adjust the portions for your crowd. Saved amounts become your prep quantities and shopping list.</p>
        </div>
        {sheetHref ? (
          <Link href={sheetHref} className="menu-sheet-link" aria-label="Kitchen sheet. Copy or print your saved plan.">
            <svg width="22" height="26" viewBox="0 0 22 26" fill="none" aria-hidden="true">
              <rect x="2" y="2" width="18" height="22" rx="2" stroke="currentColor" strokeWidth="1.5" />
              <path d="M7 8h8M7 13h8M7 18h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <span><strong>Kitchen sheet</strong><span>Copy or print your saved plan</span></span>
          </Link>
        ) : null}
      </header>
      {planningTools ? (
        <details className="menu-exploration">
          <summary>
            <span className="menu-exploration-intro">
              <strong>Try a different crowd</strong>
              <span>See what changes if the guest count moves.</span>
            </span>
            <span className="menu-exploration-action">
              <span className="menu-explore-label">Explore</span>
              <span className="menu-close-label">Close</span>
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                <path d="m5 7 4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
          </summary>
          {planningTools}
        </details>
      ) : null}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex min-w-0 flex-col gap-6">
          {dishes.length === 0 ? (
            <EmptyState
              art="menu"
              title="What are you serving?"
              steps={[
                "Pick a dish from the recipe box",
                "Set the portions per person",
                "Check the shopping list",
              ]}
            >
              <p>Nothing on the menu yet. Add a dish below.</p>
            </EmptyState>
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
                planFor={planFor}
              />
            ))
          )}
        </div>
        <aside className="flex min-w-0 flex-col gap-6 lg:sticky lg:top-[4.25rem] lg:self-start">
          <AddDishPanel recipes={available} action={addDishAction} />
          <CustomDishForm action={createDishAction} />
        </aside>
      </div>
    </div>
  );
}
