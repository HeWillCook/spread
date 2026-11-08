/**
 * "Sat, Nov 14 · 7pm · Will's backyard" (minutes only when not on the hour).
 * Pass the event's IANA `timeZone` so the result doesn't depend on the server's zone.
 */
export function formatWhen(startsAt: Date, location: string, timeZone?: string): string {
  const day = startsAt.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone,
  });
  const time = startsAt
    .toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone })
    .replace(":00", "")
    .replace(/\s/g, "")
    .toLowerCase();
  return [day, time, location].filter(Boolean).join(" · ");
}
