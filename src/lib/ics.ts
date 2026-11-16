// RFC 5545 (iCalendar) text building for the "Add to calendar" links.
// Everything here is pure so the format can be pinned by unit tests.

const END_MS = 3 * 60 * 60 * 1000;

export interface IcsEvent {
  id: string;
  title: string;
  startsAt: Date;
  location: string;
  hostName: string;
  /** The public guest link for this event. */
  url: string;
  /** Cancelled events keep their calendar entry but mark it cancelled. */
  cancelled?: boolean;
  /** DTSTAMP; defaults to now (injectable so tests are stable). */
  stamp?: Date;
}

export interface GoogleCalendarEvent {
  title: string;
  startsAt: Date;
  location: string;
  details: string;
}

/** "20261114T190000Z": the UTC form both iCalendar and Google Calendar expect. */
export function utcStamp(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

/** RFC 5545 TEXT escaping: backslash first, then the delimiters and newlines. */
export function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r\n|\r|\n/g, "\\n");
}

/**
 * Folds one content line to at most 75 octets, continuation lines starting with a
 * space (which counts toward the limit). Iterates code points so a multi-byte
 * character is never split across lines.
 */
export function foldIcsLine(line: string): string {
  const encoder = new TextEncoder();
  if (encoder.encode(line).length <= 75) return line;

  const parts: string[] = [];
  let current = "";
  let bytes = 0;
  // Continuation lines lose one octet to the leading space.
  let limit = 75;
  for (const char of line) {
    const size = encoder.encode(char).length;
    if (bytes + size > limit) {
      parts.push(current);
      current = "";
      bytes = 0;
      limit = 74;
    }
    current += char;
    bytes += size;
  }
  if (current) parts.push(current);
  return parts.map((part, index) => (index === 0 ? part : ` ${part}`)).join("\r\n");
}

/** "Hosted by Will · RSVP: https://…" for both calendar flavours. */
export function calendarDetails(hostName: string, url: string): string {
  return `Hosted by ${hostName} · RSVP: ${url}`;
}

/**
 * A complete VCALENDAR with one VEVENT: three hours long, in UTC, CRLF line
 * endings, escaped text and folded long lines. Cancelled events carry
 * `STATUS:CANCELLED`. The UID is stable so a re-download updates the same entry.
 */
export function buildIcs(event: IcsEvent): string {
  const end = new Date(event.startsAt.getTime() + END_MS);
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Spread//Spread//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${event.id}@spread`,
    `DTSTAMP:${utcStamp(event.stamp ?? new Date())}`,
    `DTSTART:${utcStamp(event.startsAt)}`,
    `DTEND:${utcStamp(end)}`,
    `SUMMARY:${escapeIcsText(event.title)}`,
    `LOCATION:${escapeIcsText(event.location)}`,
    `DESCRIPTION:${escapeIcsText(calendarDetails(event.hostName, event.url))}`,
    `URL:${event.url}`,
    ...(event.cancelled ? ["STATUS:CANCELLED"] : []),
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return `${lines.map(foldIcsLine).join("\r\n")}\r\n`;
}

/**
 * A Google Calendar "create event" link. Google takes the same compact UTC
 * timestamps as iCalendar (`dates=START/END`) and URL-decodes the rest itself.
 */
export function googleCalendarUrl(event: GoogleCalendarEvent): string {
  const end = new Date(event.startsAt.getTime() + END_MS);
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: event.title,
    dates: `${utcStamp(event.startsAt)}/${utcStamp(end)}`,
    location: event.location,
    details: event.details,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/** A safe ASCII attachment name: "fourth-of-july-again.ics". */
export function icsFilename(title: string): string {
  const slug = title
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/g, "");
  return `${slug || "event"}.ics`;
}
