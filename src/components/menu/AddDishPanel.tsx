"use client";

import { useActionState, useMemo, useState } from "react";
import type { Recipe } from "@/domain/recipes";
import { RECIPE_GROUPS, recipeCategory, type RecipeGroup } from "@/domain/recipes";
import { formatAmount } from "@/lib/menu-text";
import { Button } from "../ui/Button";
import { Card, CardRow } from "../ui/Card";
import { Field } from "../ui/Field";
import { FormError, INITIAL_MENU_FORM_STATE, type MenuFormAction } from "./menuForm";

const ALL = "All";

/** Starter recipes and the host's own that aren't on the event yet, grouped and searchable. */
export function AddDishPanel({ recipes, action }: { recipes: Recipe[]; action: MenuFormAction }) {
  const [state, formAction, pending] = useActionState(action, INITIAL_MENU_FORM_STATE);
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState<RecipeGroup | typeof ALL>(ALL);

  const groupsPresent = useMemo(
    () => RECIPE_GROUPS.filter((name) => recipes.some((r) => recipeCategory(r) === name)),
    [recipes],
  );

  const matches = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return recipes;
    return recipes.filter((recipe) => recipe.name.toLowerCase().includes(needle));
  }, [query, recipes]);

  const visible = group === ALL ? matches : matches.filter((r) => recipeCategory(r) === group);
  const visibleGroups = RECIPE_GROUPS.filter((name) =>
    visible.some((r) => recipeCategory(r) === name),
  );

  return (
    <Card className="flex flex-col gap-3">
      <h2 className="text-lg font-bold">Add a dish</h2>
      {recipes.length === 0 ? (
        <p className="text-sm text-ink/80">
          Every dish you have is already on the menu. Create your own below.
        </p>
      ) : (
        <form action={formAction} className="flex flex-col gap-3">
          <Field
            label="Find a dish"
            type="search"
            placeholder="Search the recipe box"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            hint={
              query.trim()
                ? `${visible.length} of ${recipes.length} dishes match`
                : `${recipes.length} dishes ready to add`
            }
          />

          <div
            role="group"
            aria-label="Dish categories"
            className="flex flex-wrap gap-1.5"
          >
            {([ALL, ...groupsPresent] as (RecipeGroup | typeof ALL)[]).map((name) => {
              const selected = group === name;
              return (
                <button
                  key={name}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setGroup(name)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-bold transition-colors ${
                    selected
                      ? "border-ink bg-mustard text-ink"
                      : "border-ink/30 bg-paper text-ink/80 hover:border-ink/60"
                  }`}
                >
                  {name}
                </button>
              );
            })}
          </div>

          {visible.length === 0 ? (
            <p className="py-2 text-sm text-ink/80">
              No dish matches “{query.trim()}”.{" "}
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  setGroup(ALL);
                }}
                className="font-bold underline underline-offset-2"
              >
                Show every dish
              </button>
            </p>
          ) : (
            <div className="flex flex-col gap-4 pr-1 sm:max-h-[30rem] sm:overflow-y-auto">
              {visibleGroups.map((name) => {
                const groupRecipes = visible.filter((r) => recipeCategory(r) === name);
                return (
                  <section key={name} aria-label={name} className="flex flex-col">
                    <h3 className="pb-1 font-body text-sm font-semibold text-ink-muted">
                      {name}
                      <span className="ml-1.5 font-normal normal-case text-ink/50">
                        {groupRecipes.length}
                      </span>
                    </h3>
                    {groupRecipes.map((recipe) => (
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
                  </section>
                );
              })}
            </div>
          )}

          <FormError message={state.error} />
        </form>
      )}
    </Card>
  );
}
