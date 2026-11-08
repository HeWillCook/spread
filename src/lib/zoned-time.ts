import { ValidationError } from "@/services/errors";

const LOCAL_RE = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/;

/** Throws ValidationError unless `timeZone` is a time zone this runtime knows. */
export function assertTimeZone(timeZone: string): void {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone });
  } catch {
    throw new ValidationError("Unknown time zone");
  }
}

/** How far `timeZone` is ahead of UTC at the given instant, in milliseconds. */
function offsetMs(instantMs: number, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
  }).formatToParts(new Date(instantMs));
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  const wallAsUtc = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    get("hour"),
    get("minute"),
    get("second"),
  );
  return wallAsUtc - Math.floor(instantMs / 1000) * 1000;
}

/** The inverse of zonedLocalToDate: an instant as a `datetime-local` value ("2026-11-14T19:00") in `timeZone`. */
export function dateToZonedLocal(date: Date, timeZone: string): string {
  assertTimeZone(timeZone);
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}

/**
 * Reads a `datetime-local` value ("2026-11-14T19:00") as the wall-clock time in
 * `timeZone` and returns the real instant. Independent of the server's own zone.
 *
 * DST edge cases (pinned by tests): a wall time skipped by spring-forward (02:30 on the
 * US jump day) resolves to the instant one hour BEFORE the gap, i.e. 01:30 standard
 * time. A wall time repeated by fall-back resolves to its first occurrence (daylight time).
 */
export function zonedLocalToDate(local: string, timeZone: string): Date {
  assertTimeZone(timeZone);
  const match = LOCAL_RE.exec(local.trim());
  if (!match) throw new ValidationError("Pick a valid date and time");
  const [year, month, day, hour, minute, second] = match.slice(1).map((v) => Number(v ?? 0));

  const wall = Date.UTC(year, month - 1, day, hour, minute, second);
  const check = new Date(wall);
  // Date.UTC rolls impossible values over (Feb 31 -> Mar 3); reject those.
  if (
    check.getUTCFullYear() !== year ||
    check.getUTCMonth() !== month - 1 ||
    check.getUTCDate() !== day ||
    check.getUTCHours() !== hour ||
    check.getUTCMinutes() !== minute
  ) {
    throw new ValidationError("Pick a valid date and time");
  }

  // Two passes settle the offset even when it differs between wall and guess.
  const first = wall - offsetMs(wall, timeZone);
  return new Date(wall - offsetMs(first, timeZone));
}
