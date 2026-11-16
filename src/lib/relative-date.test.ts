import { describe, expect, it } from "vitest";
import {
  changedRecently,
  countdownLabel,
  DETAILS_CHANGE_NOTICE_DAYS,
  relativeDateLabel,
} from "./relative-date";

const at = (iso: string) => new Date(iso);

describe("relativeDateLabel", () => {
  const now = at("2026-11-15T12:00:00Z");

  it("says today for the same calendar day", () => {
    expect(relativeDateLabel(at("2026-11-15T01:00:00Z"), now, "UTC")).toBe("today");
  });

  it("says yesterday for the day before", () => {
    expect(relativeDateLabel(at("2026-11-14T23:00:00Z"), now, "UTC")).toBe("yesterday");
  });

  it("counts whole days since", () => {
    expect(relativeDateLabel(at("2026-11-12T18:00:00Z"), now, "UTC")).toBe("3 days ago");
  });

  it("counts in the event's zone, not UTC", () => {
    // 22:00 Chicago on Nov 14 and 06:00 Chicago on Nov 15 are the same UTC day.
    const then = at("2026-11-15T04:00:00Z");
    expect(relativeDateLabel(then, now, "UTC")).toBe("today");
    expect(relativeDateLabel(then, now, "America/Chicago")).toBe("yesterday");
  });
});

describe("countdownLabel", () => {
  const now = at("2026-11-15T12:00:00Z");

  it("says today for a later party the same day", () => {
    expect(countdownLabel(at("2026-11-15T23:00:00Z"), "UTC", now)).toBe("today");
  });

  it("says tomorrow for the next calendar day", () => {
    expect(countdownLabel(at("2026-11-16T02:00:00Z"), "UTC", now)).toBe("tomorrow");
  });

  it("counts days for a party further out", () => {
    expect(countdownLabel(at("2026-11-21T18:00:00Z"), "UTC", now)).toBe("in 6 days");
  });

  it("has no countdown once the calendar day has passed", () => {
    expect(countdownLabel(at("2026-11-14T18:00:00Z"), "UTC", now)).toBeNull();
  });

  it("uses the event's zone for the day boundary", () => {
    // 01:00 UTC on Nov 16 is still the evening of Nov 15 in Chicago.
    const startsAt = at("2026-11-16T01:00:00Z");
    expect(countdownLabel(startsAt, "UTC", now)).toBe("tomorrow");
    expect(countdownLabel(startsAt, "America/Chicago", now)).toBe("today");
  });
});

describe("changedRecently", () => {
  const now = at("2026-11-15T12:00:00Z");

  it("is false with no change recorded", () => {
    expect(changedRecently(null, now)).toBe(false);
  });

  it("is true inside the 14-day window and false outside it", () => {
    expect(changedRecently(at("2026-11-01T12:00:00Z"), now)).toBe(true);
    expect(
      changedRecently(
        new Date(now.getTime() - (DETAILS_CHANGE_NOTICE_DAYS + 1) * 24 * 60 * 60 * 1000),
        now,
      ),
    ).toBe(false);
  });
});
