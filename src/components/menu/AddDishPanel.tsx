"use client";

import { useActionState } from "react";
import type { Recipe } from "@/domain/recipes";
import { formatAmount } from "@/lib/menu-text";
import { Button } from "../ui/Button";
import { Card, CardRow } from "../ui/Card";
import { FormError, INITIAL_MENU_FORM_STATE, type MenuFormAction } from "./menuForm";

/** Starter recipes and the host's own that aren't on the event yet, one tap to add. */
export function AddDishPanel({ recipes, action }: { recipes: Recipe[]; action: MenuFormAction }) {
  const [state, formAction, pending] = useActionState(action, INITIAL_MENU_FORM_STATE);
  return (
    <Card className="flex flex-col gap-3">
      <h2 className="text-lg font-bold">Add a dish</h2>
      {recipes.length === 0 ? (
        <p className="text-sm text-ink/80">
          Every dish you have is already on the menu. Create your own below.
        </p>
      ) : (
        <form action={formAction} className="flex flex-col gap-3">
          <div>
            {recipes.map((recipe) => (
              <CardRow key={recipe.id}>
                <div className="flex min-w-0 flex-col">
                  <span className="font-bold">
                    <span aria-hidden="true">{recipe.emoji}</span> {recipe.name}
                  </span>
                  <span className="text-xs text-ink/70">
                    {formatAmount(recipe.defaultServingsPerPerson)} per person
                  </span>
                </div>
                <Button
                  variant="mustard"
                  type="submit"
                  name="recipeId"
                  value={recipe.id}
                  disabled={pending}
                  aria-label={`Add ${recipe.name}`}
                >
                  Add
                </Button>
              </CardRow>
            ))}
          </div>
          <FormError message={state.error} />
        </form>
      )}
    </Card>
  );
}
