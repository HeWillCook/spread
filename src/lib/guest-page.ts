import { formatWhen } from "./format";

/** `?new=1` on the event link: ignore the remembered guest and show a blank form. */
export function wantsBlankForm(searchParams: { [key: string]: string | string[] | undefined }): boolean {
  return searchParams.new === "1";
}

/**
 * Title and description for chat link previews. Only public event fields go in;
 * never guest data. With no event (unknown code) it is a generic preview.
 */
export function eventPreview(
  event: { title: string; startsAt: Date; timezone: string; hostName: string } | null,
): { title: string; description: string } {
  if (!event) return { title: "Cookout", description: "RSVP to a cookout" };
  return {
    // No location here: formatWhen skips an empty one.
    title: `${event.title} · ${formatWhen(event.startsAt, "", event.timezone)}`,
    description: `RSVP to ${event.hostName}'s cookout`,
  };
}
