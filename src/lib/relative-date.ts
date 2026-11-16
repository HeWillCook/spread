/**
 * Calendar-day phrasing: "today", "tomorrow", "in 6 days"; "yesterday",
 * "3 days ago". Days are counted in a chosen IANA zone, so a host in Chicago
 * doesn't see "tomorrow" flip at midnight UTC.
 */

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** How long an anonymous guest keeps seeing the "Updated …" notice. */
export const DETAILS_CHANGE_NOTICE_DAYS = 14;

/** Days since the Unix epoch for the calendar date in `timeZone`. */
function dayNumber(date: Date, timeZone?: string): number {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const part = (type: string) =>
    Number(parts.find((candidate) => candidate.type === type)?.value ?? "0");
  return Math.floor(Date.UTC(part("year"), part("month") - 1, part("day")) / MS_PER_DAY);
}

/** "today", "yesterday", "3 days ago". A future timestamp reads as "today". */
export function relativeDateLabel(
  then: Date,
  now: Date = new Date(),
  timeZone?: string,
): string {
  const days = dayNumber(now, timeZone) - dayNumber(then, timeZone);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  return `${days} days ago`;
}

/**
 * "today", "tomorrow", "in 6 days" for an event still ahead; null once its
 * calendar day has passed (the dashboard hides past cards anyway).
 */
export function countdownLabel(
  startsAt: Date,
  timeZone: string,
  now: Date = new Date(),
): string | null {
  const days = dayNumber(startsAt, timeZone) - dayNumber(now, timeZone);
  if (days < 0) return null;
  if (days === 0) return "today";
  if (days === 1) return "tomorrow";
  return `in ${days} days`;
}

/** True when the details changed within the last `days` (anonymous guest window). */
export function changedRecently(
  changedAt: Date | null,
  now: Date = new Date(),
  days: number = DETAILS_CHANGE_NOTICE_DAYS,
): boolean {
  if (!changedAt) return false;
  return now.getTime() - changedAt.getTime() <= days * MS_PER_DAY;
}
