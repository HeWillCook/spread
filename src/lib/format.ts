/** "Sat · 7pm · Will's backyard" (minutes only when not on the hour). */
export function formatWhen(startsAt: Date, location: string): string {
  const day = startsAt.toLocaleDateString("en-US", { weekday: "short" });
  const time = startsAt
    .toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
    .replace(":00", "")
    .replace(/\s/g, "")
    .toLowerCase();
  return [day, time, location].filter(Boolean).join(" · ");
}
