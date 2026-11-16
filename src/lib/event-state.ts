/**
 * Where an event sits in its life, from the lifecycle columns on `events`:
 * deleted > cancelled > past > upcoming.
 *
 * "Past" is derived from the start time; there is no archived column. The
 * twelve-hour grace keeps the day-of screens and the morning-after clean-up in
 * the upcoming bucket while the party is still going on.
 */

/** Twelve hours after the start, an event has happened and moves to the past list. */
export const PAST_GRACE_MS = 12 * 60 * 60 * 1000;

export type EventState = "deleted" | "cancelled" | "past" | "upcoming";

export interface EventLifecycle {
  startsAt: Date;
  cancelledAt: Date | null;
  deletedAt: Date | null;
}

/** True once the start time is more than the grace period behind `now`. */
export function isPastEvent(
  event: Pick<EventLifecycle, "startsAt">,
  now: Date = new Date(),
): boolean {
  return event.startsAt.getTime() < now.getTime() - PAST_GRACE_MS;
}

/** One helper for every screen: deleted wins over cancelled, which wins over past. */
export function eventState(event: EventLifecycle, now: Date = new Date()): EventState {
  if (event.deletedAt) return "deleted";
  if (event.cancelledAt) return "cancelled";
  return isPastEvent(event, now) ? "past" : "upcoming";
}

export interface EventBuckets<T> {
  /** Soonest first. */
  upcoming: T[];
  /** Most recent first. */
  past: T[];
}

/**
 * Splits events by date only, so a cancelled event lands in its date bucket
 * (the card shows a "Cancelled" badge instead). Deleted events are expected to
 * be filtered out by the caller, as `listHostEvents` does.
 */
export function splitEventsByTime<T extends { startsAt: Date }>(
  events: T[],
  now: Date = new Date(),
): EventBuckets<T> {
  const upcoming: T[] = [];
  const past: T[] = [];
  for (const event of events) {
    (isPastEvent(event, now) ? past : upcoming).push(event);
  }
  upcoming.sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
  past.sort((a, b) => b.startsAt.getTime() - a.startsAt.getTime());
  return { upcoming, past };
}
