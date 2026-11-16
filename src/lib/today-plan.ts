import type { PrepSheet } from "./prep-sheet";
import { formatBuyQty } from "./shopping-text";
import { dateToZonedLocal, zonedLocalToDate } from "./zoned-time";

const HOUR_MS = 60 * 60 * 1000;

export interface TodayPlanEvent {
  id: string;
  title: string;
  startsAt: Date;
  /** IANA zone the event's times belong to. */
  timezone: string;
}

/** The shopping fields the day-of list reads (see getShoppingPlan's lines). */
export interface TodayShoppingLine {
  itemId: string;
  name: string;
  buyQty: number;
  buyUnit: string;
  /** The effective tick: false while a tick needs rechecking counts as not done. */
  checked: boolean;
  needsReview: boolean;
}

export interface TodayChecklistItem {
  id: string;
  label: string;
  /** Secondary line: a quantity, or why the item needs a second look. */
  detail?: string;
}

export interface TodayMilestone {
  id: string;
  label: string;
  /** Wall-clock time in the event's zone, e.g. "4:00 PM". */
  timeLabel: string;
}

export interface TodayPlan {
  eventId: string;
  title: string;
  /** Event date, time and place in the event's own zone. */
  when: string;
  planFor: number;
  headcountLine: string;
  milestones: TodayMilestone[];
  /** Unticked shopping items that actually need buying. */
  shopping: TodayChecklistItem[];
  /** One checklist row per dish, with the servings to make. */
  prep: TodayChecklistItem[];
}

export interface BuildTodayPlanInput {
  event: TodayPlanEvent;
  shopping: TodayShoppingLine[];
  prepSheet: Pick<PrepSheet, "when" | "headcount" | "headcountLine" | "dishes">;
}

function timeLabel(date: Date, timeZone: string): string {
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone,
  });
}

/**
 * "Shopping done" is 9am on the event's own morning, pulled earlier for events
 * that start before 1pm so it always lands before prep begins.
 */
function shoppingDoneAt(startsAt: Date, timeZone: string): Date {
  const localDate = dateToZonedLocal(startsAt, timeZone).slice(0, 10);
  const nineAm = zonedLocalToDate(`${localDate}T09:00`, timeZone);
  const cutoff = new Date(startsAt.getTime() - 4 * HOUR_MS);
  return nineAm.getTime() <= cutoff.getTime() ? nineAm : cutoff;
}

/**
 * The day-of checklist from data Spread already has: fixed milestones around the
 * start time, the shopping still outstanding, and what each dish makes. There is
 * no cooking-time data, so nothing here claims a cook time.
 */
export function buildTodayPlan({ event, shopping, prepSheet }: BuildTodayPlanInput): TodayPlan {
  const shoppingDone = shoppingDoneAt(event.startsAt, event.timezone);
  const milestones: TodayMilestone[] = [
    { id: "shopping-done", label: "Shopping done", timeLabel: timeLabel(shoppingDone, event.timezone) },
    {
      id: "start-prep",
      label: "Start prep",
      timeLabel: timeLabel(new Date(event.startsAt.getTime() - 3 * HOUR_MS), event.timezone),
    },
    {
      id: "set-up",
      label: "Set up",
      timeLabel: timeLabel(new Date(event.startsAt.getTime() - HOUR_MS), event.timezone),
    },
    {
      id: "guests-arrive",
      label: "Guests arrive",
      timeLabel: timeLabel(event.startsAt, event.timezone),
    },
  ];

  const outstanding: TodayChecklistItem[] = shopping
    .filter((line) => !line.checked && line.buyQty > 0)
    .map((line) => ({
      id: `shop:${line.itemId}`,
      label: line.name,
      detail: line.needsReview
        ? `${formatBuyQty(line.buyQty, line.buyUnit)} to buy · recheck the amount`
        : `${formatBuyQty(line.buyQty, line.buyUnit)} to buy`,
    }));

  const prep: TodayChecklistItem[] = prepSheet.dishes.map((dish) => ({
    id: `prep:${dish.dishId}`,
    label: dish.name,
    detail: `make ${dish.servingsLabel}`,
  }));

  return {
    eventId: event.id,
    title: event.title,
    when: prepSheet.when,
    planFor: prepSheet.headcount.planFor,
    headcountLine: prepSheet.headcountLine,
    milestones,
    shopping: outstanding,
    prep,
  };
}
