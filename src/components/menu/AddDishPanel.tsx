"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { formatCents } from "@/domain/money";
import { RECIPE_GROUPS, recipeCategory, type RecipeGroup } from "@/domain/recipes";
import { buildShoppingList } from "@/domain/shopping";
import { dishAnchorId } from "@/lib/menu-fields";
import {
  appetiteLabel,
  formatAmount,
  formatIngredientAmount,
  servingWord,
  timeRow,
  totalTimeLabel,
} from "@/lib/menu-text";
import type { MenuRecipe } from "@/services/menu";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { Field } from "../ui/Field";
import {
  FormError,
  FormStatus,
  INITIAL_MENU_FORM_STATE,
  type MenuFormAction,
} from "./menuForm";

const ALL = "All";

/** The picker section for a recipe, including copies that inherit a starter's section. */
function groupFor(recipe: MenuRecipe): RecipeGroup {
  return recipe.category ?? recipeCategory(recipe);
}

/** Rough ingredient cost for one person at the recipe's default appetite, in cents. */
export function costPerPersonCents(recipe: MenuRecipe): number {
  const lines = buildShoppingList(
    [{ recipe, servingsPerPerson: recipe.defaultServingsPerPerson }],
    10,
  );
  const total = lines.reduce((sum, line) => sum + line.estCostCents, 0);
  return Math.round(total / 10);
}

interface SearchResult {
  recipe: MenuRecipe;
  /** Ingredient names that matched the query, so the row can say why it showed up. */
  ingredientHits: string[];
}

/**
 * Search across the dish name, its description, its category and its ingredients.
 * Every whitespace-separated term has to match somewhere.
 */
export function searchRecipes(recipes: MenuRecipe[], query: string): SearchResult[] {
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return recipes.map((recipe) => ({ recipe, ingredientHits: [] }));

  const results: SearchResult[] = [];
  for (const recipe of recipes) {
    const category = groupFor(recipe);
    const text = [recipe.name, recipe.description ?? "", category].join(" ").toLowerCase();
    const hits = new Set<string>();
    let matchedAll = true;
    for (const term of terms) {
      const ingredientHits = recipe.items.filter((item) =>
        item.name.toLowerCase().includes(term),
      );
      if (!text.includes(term) && ingredientHits.length === 0) {
        matchedAll = false;
        break;
      }
      for (const item of ingredientHits) hits.add(item.name);
    }
    if (matchedAll) results.push({ recipe, ingredientHits: [...hits].slice(0, 2) });
  }
  return results;
}

function Preview({ recipe }: { recipe: MenuRecipe }) {
  const times = timeRow(recipe);
  const cost = costPerPersonCents(recipe);
  return (
    <div
      role="region"
      aria-label={`Preview ${recipe.name}`}
      className="mt-2 flex flex-col gap-2 rounded-xl bg-cream/40 p-3 text-sm leading-relaxed"
    >
      {recipe.description ? <p>{recipe.description}</p> : null}
      {times ? <p className="font-bold text-ink/85">{times}</p> : null}
      <ul className="flex flex-col gap-0.5">
        {recipe.items.map((item) => (
          <li key={item.id}>
            <span aria-hidden="true">{item.emoji}</span> {item.name}{" "}
            <span className="text-ink/70">
              — {formatIngredientAmount(item.perServing, item.unit)} per{" "}
              {servingWord(recipe.name)}
            </span>
          </li>
        ))}
      </ul>
      <p className="font-bold text-ink/85">Estimated {formatCents(cost)} per person</p>
    </div>
  );
}

/** Starter recipes and the host's own that aren't on the event yet, grouped and searchable. */
export function AddDishPanel({
  recipes,
  action,
  onAdded,
}: {
  recipes: MenuRecipe[];
  action: MenuFormAction;
  /** Called with the new dish id so the menu can open its card. */
  onAdded?: (dishId: string) => void;
}) {
  const [state, formAction, pending] = useActionState(action, INITIAL_MENU_FORM_STATE);
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState<RecipeGroup | typeof ALL>(ALL);
  const [openId, setOpenId] = useState<string | null>(null);

  // After a successful add, bring the new dish card into view and focus it.
  useEffect(() => {
    if (!state.added) return;
    onAdded?.(state.added.dishId);
    const card = document.getElementById(dishAnchorId(state.added.dishId));
    if (!card) return;
    if (typeof card.scrollIntoView === "function") {
      card.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    card.focus({ preventScroll: true });
  }, [state.added, onAdded]);

  const groupsPresent = useMemo(
    () => RECIPE_GROUPS.filter((name) => recipes.some((r) => groupFor(r) === name)),
    [recipes],
  );

  const matches = useMemo(() => searchRecipes(recipes, query), [query, recipes]);

  const visible = group === ALL ? matches : matches.filter((r) => groupFor(r.recipe) === group);
  const visibleGroups = RECIPE_GROUPS.filter((name) =>
    visible.some((r) => groupFor(r.recipe) === name),
  );
  const hasQuery = query.trim().length > 0;
  const hasGroup = group !== ALL;

  return (
    <Card className="flex flex-col gap-3">
      <h2 className="text-lg font-bold">Add a dish</h2>

      <Field
        label="Find a dish"
        type="search"
        placeholder="Search by name, ingredient or category"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        // Enter in the search box must never submit a dish; the search is local and instant.
        onKeyDown={(event) => {
          if (event.key === "Enter") event.preventDefault();
        }}
        hint={
          recipes.length === 0
            ? "Nothing left to add"
            : hasQuery
              ? `${visible.length} of ${recipes.length} dishes match`
              : `${recipes.length} dishes ready to add`
        }
      />

      {recipes.length === 0 ? (
        <p className="text-sm leading-relaxed text-ink/80">
          Every dish you have is already on the menu. Create your own dish below.
        </p>
      ) : (
        <>
          <div
            role="group"
            aria-label="Dish categories"
            className="flex flex-nowrap gap-1.5 overflow-x-auto pb-1"
          >
            {([ALL, ...groupsPresent] as (RecipeGroup | typeof ALL)[]).map((name) => {
              const selected = group === name;
              return (
                <button
                  key={name}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setGroup(name)}
                  className={`min-h-11 shrink-0 whitespace-nowrap rounded-full border px-3.5 py-2 text-sm font-bold transition-colors ${
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
            <div className="flex flex-col gap-2 py-2 text-sm text-ink/80">
              <p>
                {hasQuery ? (
                  <>
                    No {hasGroup ? `${group.toLowerCase()} dish` : "dish"} matches{" "}
                    <span className="font-bold">“{query.trim()}”</span>.
                  </>
                ) : (
                  <>Nothing in {group} yet.</>
                )}
              </p>
              <div className="flex flex-wrap gap-2">
                {hasQuery ? (
                  <Button variant="outline" onClick={() => setQuery("")}>
                    Clear search
                  </Button>
                ) : null}
                {hasGroup ? (
                  <Button variant="outline" onClick={() => setGroup(ALL)}>
                    Show all categories
                  </Button>
                ) : null}
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-4 pr-1 sm:max-h-[30rem] sm:overflow-y-auto">
              {visibleGroups.map((name) => {
                const groupResults = visible.filter((r) => groupFor(r.recipe) === name);
                return (
                  <section key={name} aria-label={name} className="flex flex-col">
                    <h3 className="pb-1 font-body text-sm font-semibold text-ink-muted">
                      {name}
                      <span className="ml-1.5 font-normal normal-case text-ink/50">
                        {groupResults.length}
                      </span>
                    </h3>
                    {groupResults.map(({ recipe, ingredientHits }) => {
                      const totalTime = totalTimeLabel(recipe);
                      const open = openId === recipe.id;
                      return (
                        <div
                          key={recipe.id}
                          className="flex flex-col gap-1 border-t border-dashed border-divider py-3 first:border-t-0 first:pt-0 last:pb-0"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div className="flex min-w-0 flex-col">
                              <span className="font-bold">
                                <span aria-hidden="true">{recipe.emoji}</span> {recipe.name}
                              </span>
                              <span className="text-xs text-ink/70">
                                {formatAmount(recipe.defaultServingsPerPerson)}{" "}
                                {appetiteLabel(recipe.name)}
                                {totalTime ? ` · ${totalTime}` : ""}
                              </span>
                              {ingredientHits.length > 0 ? (
                                <span className="text-xs text-ink/70">
                                  has {ingredientHits.join(", ").toLowerCase()}
                                </span>
                              ) : null}
                            </div>
                            <div className="flex shrink-0 items-center gap-2">
                              <Button
                                variant="outline"
                                aria-expanded={open}
                                aria-controls={`preview-${recipe.id}`}
                                onClick={() => setOpenId(open ? null : recipe.id)}
                                aria-label={`Preview ${recipe.name}`}
                              >
                                Preview
                              </Button>
                              <form action={formAction}>
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
                              </form>
                            </div>
                          </div>
                          <div id={`preview-${recipe.id}`} hidden={!open}>
                            {open ? <Preview recipe={recipe} /> : null}
                          </div>
                        </div>
                      );
                    })}
                  </section>
                );
              })}
            </div>
          )}
        </>
      )}

      <FormError message={state.error} />
      <FormStatus message={state.added ? `Added ${state.added.name} to the menu` : null} />
    </Card>
  );
}
