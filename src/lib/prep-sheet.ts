import type { Headcount } from "@/domain/headcount";
import { formatWhen } from "@/lib/format";
import { servingWord } from "@/lib/menu-text";
import { buildShoppingList, type ShoppingLine } from "@/domain/shopping";
import { formatBuyQty, headcountLine } from "@/lib/shopping-text";
import type { GuestRow } from "@/services/guestsOverview";
import type { MenuDish } from "@/services/menu";

/** The saved event fields a kitchen sheet may show. Deliberately no share code or invite URL. */
export interface PrepEvent {
  id: string;
  title: string;
  startsAt: Date;
  location: string;
  timezone: string;
}

export interface PrepIngredient {
  itemId: string;
  name: string;
  emoji: string;
  /** Scaled amount needed for this dish at the saved planning count. */
  needed: number;
  unit: string;
  /** Human-readable needed amount, e.g. "1.5 lb". */
  neededLabel: string;
}

export interface PrepDish {
  dishId: string;
  name: string;
  emoji: string;
  /** Servings this dish makes at the saved planning count, including up to whole servings. */
  servings: number;
  servingsPerPerson: number;
  /** e.g. "12 burgers". */
  servingsLabel: string;
  ingredients: PrepIngredient[];
}

export interface PrepShoppingItem {
  itemId: string;
  name: string;
  emoji: string;
  /** Scaled amount needed, before rounding up to buy units. */
  needed: number;
  unit: string;
  neededLabel: string;
  /** Whole buy units, rounded up by buildShoppingList. */
  buyQty: number;
  buyUnit: string;
  /** e.g. "3 packs". */
  buyLabel: string;
}

export interface PrepFoodNote {
  guestId: string;
  name: string;
  status: "yes" | "maybe";
  notes: string;
}

export interface PrepSheet {
  eventId: string;
  title: string;
  /** Event date, time and place in the event's own time zone. */
  when: string;
  headcount: Headcount;
  /** Human-readable count/range, e.g. "8 confirmed + ~2 from maybes · range 8–11". */
  headcountLine: string;
  /** True when at least one dish is saved. */
  hasMenu: boolean;
  dishes: PrepDish[];
  shopping: PrepShoppingItem[];
  /** Host-only; only yes/maybe guests with non-blank notes. */
  foodNotes: PrepFoodNote[];
}

export interface BuildPrepSheetInput {
  event: PrepEvent;
  dishes: MenuDish[];
  headcount: Headcount;
  guests: Pick<GuestRow, "id" | "name" | "status" | "foodNotes">[];
}

/** Saved planned headcount, distinct from RSVP answers or confirmed attendance. */
export function planningLabel(headcount: Headcount): string {
  if (headcount.planFor <= 0) return "Planning for 0 people";
  return `Planning for ~${headcount.planFor} ${headcount.planFor === 1 ? "person" : "people"}`;
}

/** Why a saved sheet has no shopping quantities. Shared by screen and copy. */
export function emptyShoppingLabel(sheet: Pick<PrepSheet, "hasMenu" | "headcount">): string {
  if (!sheet.hasMenu) return "Nothing to buy until dishes are on the menu.";
  if (sheet.headcount.planFor <= 0) {
    return "Nothing to buy yet. Quantities appear when people are included in your plan.";
  }
  return "Nothing to buy for the saved portions.";
}

function neededLabel(needed: number, unit: string): string {
  // Two decimals matches the menu's prep display and hides float noise like 1.5000000000002.
  return formatBuyQty(Number(needed.toFixed(2)), unit);
}

/**
 * Builds the saved kitchen sheet from the same menu, portions and headcount the
 * Shopping and Menu tabs use. This function only reads; it never changes RSVPs,
 * portions, prices or payments.
 */
export function buildPrepSheet({
  event,
  dishes,
  headcount,
  guests,
}: BuildPrepSheetInput): PrepSheet {
  const built = buildShoppingList(
    dishes.map((dish) => ({
      recipe: dish.recipe,
      servingsPerPerson: dish.servingsPerPerson,
    })),
    headcount.planFor,
  );
  const linesByRecipe = new Map<string, ShoppingLine[]>();
  for (const line of built) {
    const list = linesByRecipe.get(line.recipeId) ?? [];
    list.push(line);
    linesByRecipe.set(line.recipeId, list);
  }

  const prepDishes: PrepDish[] = dishes.map((dish) => {
    const lines = linesByRecipe.get(dish.recipe.id) ?? [];
    // buildShoppingList rounds servings up to whole servings; every line carries the same value.
    const servings = lines[0]?.servings ?? 0;
    return {
      dishId: dish.dishId,
      name: dish.recipe.name,
      emoji: dish.recipe.emoji,
      servings,
      servingsPerPerson: dish.servingsPerPerson,
      servingsLabel: formatBuyQty(servings, servingWord(dish.recipe.name)),
      ingredients: lines.map((line) => ({
        itemId: line.itemId,
        name: line.name,
        emoji: line.emoji,
        needed: line.needed,
        unit: line.neededUnit,
        neededLabel: neededLabel(line.needed, line.neededUnit),
      })),
    };
  });

  // A zero headcount still leaves the dishes visible, but buying "0 packs" is noise.
  const shopping: PrepShoppingItem[] = built
    .filter((line) => line.buyQty > 0)
    .map((line) => ({
      itemId: line.itemId,
      name: line.name,
      emoji: line.emoji,
      needed: line.needed,
      unit: line.neededUnit,
      neededLabel: neededLabel(line.needed, line.neededUnit),
      buyQty: line.buyQty,
      buyUnit: line.buyUnit,
      buyLabel: formatBuyQty(line.buyQty, line.buyUnit),
    }));

  const foodNotes: PrepFoodNote[] = [];
  for (const guest of guests) {
    if (guest.status === "no") continue;
    const notes = guest.foodNotes?.trim() ?? "";
    if (!notes) continue;
    foodNotes.push({
      guestId: guest.id,
      name: guest.name,
      status: guest.status,
      notes,
    });
  }

  return {
    eventId: event.id,
    title: event.title,
    when: formatWhen(event.startsAt, event.location, event.timezone),
    headcount,
    headcountLine: headcountLine(headcount),
    hasMenu: dishes.length > 0,
    dishes: prepDishes,
    shopping,
    foodNotes,
  };
}

/**
 * Plain text for copy/paste and a plain-language print backup. Saved data only:
 * no links, invitation codes, emails, payment details or cooking instructions.
 */
export function prepSheetText(sheet: PrepSheet): string {
  const lines: string[] = [
    sheet.title,
    sheet.when,
    "",
    planningLabel(sheet.headcount),
    sheet.headcountLine,
    "",
    "Menu prep",
  ];

  if (!sheet.hasMenu) {
    lines.push("No dishes saved yet. Add dishes and portions on the Menu tab.");
  } else {
    for (const [index, dish] of sheet.dishes.entries()) {
      if (index > 0) lines.push("");
      lines.push(`${dish.name} — ${dish.servingsLabel}`);
      for (const ingredient of dish.ingredients) {
        lines.push(`- ${ingredient.name}: ${ingredient.neededLabel}`);
      }
    }
  }

  lines.push("", "Shopping");
  if (sheet.shopping.length === 0) {
    lines.push(emptyShoppingLabel(sheet));
  } else {
    for (const item of sheet.shopping) {
      lines.push(`[ ] ${item.name}: ${item.buyLabel}`);
    }
  }

  if (sheet.foodNotes.length > 0) {
    lines.push("", "Food notes (host only)");
    for (const note of sheet.foodNotes) {
      lines.push(`- ${note.name} (${note.status === "yes" ? "going" : "maybe"}): ${note.notes}`);
    }
    lines.push(
      "Notes don't automatically change recipe quantities; check with your guest before cooking.",
    );
  }

  lines.push(
    "",
    "Quantities use your saved RSVPs and portions. Attendance can still change.",
  );
  return lines.join("\n");
}
