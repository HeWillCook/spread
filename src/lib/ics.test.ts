// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  buildIcs,
  calendarDetails,
  escapeIcsText,
  foldIcsLine,
  googleCalendarUrl,
  icsFilename,
  utcStamp,
} from "./ics";

const event = {
  id: "evt-1",
  title: "Fourth of July",
  startsAt: new Date("2026-11-15T01:00:00Z"), // 7pm on Nov 14 in Chicago
  location: "Will's backyard",
  hostName: "Will",
  url: "https://spread.example/e/abc1234567",
  stamp: new Date("2026-11-01T12:34:56Z"),
};

const lines = (ics: string) => ics.split("\r\n");

describe("buildIcs", () => {
  it("writes one UTC VEVENT three hours long with CRLF endings", () => {
    const ics = buildIcs(event);
    expect(ics.endsWith("\r\n")).toBe(true);
    expect(ics.replace(/\r\n/g, "")).not.toMatch(/[\r\n]/);
    expect(lines(ics)).toEqual(
      expect.arrayContaining([
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "BEGIN:VEVENT",
        "UID:evt-1@spread",
        "DTSTAMP:20261101T123456Z",
        "DTSTART:20261115T010000Z",
        "DTEND:20261115T040000Z",
        "SUMMARY:Fourth of July",
        "LOCATION:Will's backyard",
        "DESCRIPTION:Hosted by Will · RSVP: https://spread.example/e/abc1234567",
        "URL:https://spread.example/e/abc1234567",
        "END:VEVENT",
        "END:VCALENDAR",
      ]),
    );
  });

  it("leaves STATUS off a normal event and marks a cancelled one", () => {
    expect(buildIcs(event)).not.toContain("STATUS:");
    expect(buildIcs({ ...event, cancelled: true })).toContain("STATUS:CANCELLED\r\n");
  });

  it("escapes backslashes, semicolons, commas and newlines in text fields", () => {
    const ics = buildIcs({
      ...event,
      title: 'Burgers, dogs; "fixins" \\ late\nnight',
      location: "Patio; side, door",
    });
    expect(ics).toContain('SUMMARY:Burgers\\, dogs\\; "fixins" \\\\ late\\nnight\r\n');
    expect(ics).toContain("LOCATION:Patio\\; side\\, door\r\n");
  });

  it("folds lines over 75 octets and unfolds back to the same value", () => {
    const title = "A".repeat(100);
    const ics = buildIcs({ ...event, title });
    const encoder = new TextEncoder();
    for (const line of lines(ics)) {
      expect(encoder.encode(line).length).toBeLessThanOrEqual(75);
    }
    const unfolded = ics.replace(/\r\n /g, "");
    expect(lines(unfolded)).toContain(`SUMMARY:${title}`);
  });

  it("folds without splitting a multi-byte character", () => {
    const title = "é".repeat(80);
    const ics = buildIcs({ ...event, title });
    const encoder = new TextEncoder();
    for (const line of lines(ics)) {
      expect(encoder.encode(line).length).toBeLessThanOrEqual(75);
    }
    expect(lines(ics.replace(/\r\n /g, ""))).toContain(`SUMMARY:${title}`);
  });
});

describe("calendar helpers", () => {
  it("formats UTC timestamps compactly", () => {
    expect(utcStamp(new Date("2026-01-02T03:04:05Z"))).toBe("20260102T030405Z");
  });

  it("escapes text in the RFC 5545 order", () => {
    expect(escapeIcsText("a\\b;c,d\r\ne")).toBe("a\\\\b\\;c\\,d\\ne");
  });

  it("folds to 75 octets including the continuation space", () => {
    const folded = foldIcsLine("x".repeat(200));
    const parts = folded.split("\r\n");
    expect(parts[0]).toHaveLength(75);
    expect(parts[1].startsWith(" ")).toBe(true);
    expect(parts.every((p) => p.length <= 75)).toBe(true);
    expect(folded.replace(/\r\n /g, "")).toHaveLength(200);
  });

  it("builds a Google Calendar link with UTC dates, text, location and details", () => {
    const url = new URL(
      googleCalendarUrl({
        title: "Fourth of July",
        startsAt: event.startsAt,
        location: "Will's backyard",
        details: calendarDetails("Will", event.url),
      }),
    );
    expect(url.origin + url.pathname).toBe(
      "https://calendar.google.com/calendar/render",
    );
    expect(url.searchParams.get("action")).toBe("TEMPLATE");
    expect(url.searchParams.get("text")).toBe("Fourth of July");
    expect(url.searchParams.get("dates")).toBe("20261115T010000Z/20261115T040000Z");
    expect(url.searchParams.get("location")).toBe("Will's backyard");
    expect(url.searchParams.get("details")).toBe(
      "Hosted by Will · RSVP: https://spread.example/e/abc1234567",
    );
  });

  it("slugs the attachment filename", () => {
    expect(icsFilename("Will's 4th of July!")).toBe("will-s-4th-of-july.ics");
    expect(icsFilename("🎉")).toBe("event.ics");
  });
});
