import { describe, expect, it } from "vitest";
import { formatWhen } from "./format";

const SAT_7PM_UTC = new Date("2026-11-14T19:00:00Z");

describe("formatWhen", () => {
  it("formats weekday, calendar date, hour and location", () => {
    expect(formatWhen(SAT_7PM_UTC, "Will's backyard", "UTC")).toBe(
      "Sat, Nov 14 · 7pm · Will's backyard",
    );
  });

  it("keeps minutes when not on the hour", () => {
    expect(formatWhen(new Date("2026-11-14T12:30:00Z"), "Park", "UTC")).toBe(
      "Sat, Nov 14 · 12:30pm · Park",
    );
  });

  it("skips an empty location", () => {
    expect(formatWhen(SAT_7PM_UTC, "", "UTC")).toBe("Sat, Nov 14 · 7pm");
  });

  it("renders in the event's own time zone, not the server's", () => {
    // 7pm Chicago on Nov 14 is 01:00 UTC on Nov 15.
    const instant = new Date("2026-11-15T01:00:00Z");
    expect(formatWhen(instant, "", "America/Chicago")).toBe("Sat, Nov 14 · 7pm");
    expect(formatWhen(instant, "", "UTC")).toBe("Sun, Nov 15 · 1am");
  });
});
