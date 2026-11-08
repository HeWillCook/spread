// @vitest-environment node
import { describe, expect, it } from "vitest";
import { ValidationError } from "@/services/errors";
import { assertTimeZone, dateToZonedLocal, zonedLocalToDate } from "./zoned-time";

describe("dateToZonedLocal", () => {
  it("writes an instant as a datetime-local value in the given zone", () => {
    expect(dateToZonedLocal(new Date("2026-11-15T01:00:00Z"), "America/Chicago")).toBe("2026-11-14T19:00");
    expect(dateToZonedLocal(new Date("2026-07-05T00:00:00Z"), "America/Chicago")).toBe("2026-07-04T19:00");
    expect(dateToZonedLocal(new Date("2026-11-14T13:30:00Z"), "Asia/Kolkata")).toBe("2026-11-14T19:00");
    expect(dateToZonedLocal(new Date("2026-11-14T00:05:00Z"), "UTC")).toBe("2026-11-14T00:05");
  });

  it("round-trips with zonedLocalToDate", () => {
    for (const [local, zone] of [
      ["2026-12-05T18:00", "America/Los_Angeles"],
      ["2026-03-01T09:30", "Europe/Berlin"],
      ["2026-06-30T23:45", "Pacific/Auckland"],
    ] as const) {
      expect(dateToZonedLocal(zonedLocalToDate(local, zone), zone)).toBe(local);
    }
  });

  it("shows midnight as 00:00, not 24:00", () => {
    expect(dateToZonedLocal(new Date("2026-11-14T06:00:00Z"), "America/Chicago")).toBe("2026-11-14T00:00");
  });
});

describe("zonedLocalToDate", () => {
  it("reads a datetime-local value as wall-clock time in the given zone", () => {
    expect(zonedLocalToDate("2026-11-14T19:00", "America/Chicago").toISOString()).toBe(
      "2026-11-15T01:00:00.000Z",
    );
    expect(zonedLocalToDate("2026-07-04T19:00", "America/Chicago").toISOString()).toBe(
      "2026-07-05T00:00:00.000Z",
    );
    expect(zonedLocalToDate("2026-11-14T19:00", "UTC").toISOString()).toBe("2026-11-14T19:00:00.000Z");
    expect(zonedLocalToDate("2026-11-14T19:00", "Asia/Kolkata").toISOString()).toBe(
      "2026-11-14T13:30:00.000Z",
    );
  });

  it("gives the same instant whatever the server's own zone is", () => {
    const original = process.env.TZ;
    try {
      const results = ["UTC", "Asia/Tokyo", "America/New_York"].map((tz) => {
        process.env.TZ = tz;
        return zonedLocalToDate("2026-03-08T12:00", "America/Chicago").toISOString();
      });
      expect(new Set(results).size).toBe(1);
    } finally {
      if (original === undefined) delete process.env.TZ;
      else process.env.TZ = original;
    }
  });

  it("a wall time skipped by spring-forward resolves to the instant one hour before the gap", () => {
    // 2026-03-08: New York jumps from 02:00 EST straight to 03:00 EDT, so 02:30 never exists.
    // It resolves to 06:30Z, which is 01:30 EST (just before the gap), not 03:30 EDT.
    const skipped = zonedLocalToDate("2026-03-08T02:30", "America/New_York");
    expect(skipped.toISOString()).toBe("2026-03-08T06:30:00.000Z");
    expect(dateToZonedLocal(skipped, "America/New_York")).toBe("2026-03-08T01:30");
    // Same in Chicago (the jump is at 02:00 CST).
    expect(zonedLocalToDate("2026-03-08T02:30", "America/Chicago").toISOString()).toBe(
      "2026-03-08T07:30:00.000Z",
    );
    // Times either side of the gap are unaffected.
    expect(zonedLocalToDate("2026-03-08T01:30", "America/New_York").toISOString()).toBe(
      "2026-03-08T06:30:00.000Z",
    );
    expect(zonedLocalToDate("2026-03-08T03:30", "America/New_York").toISOString()).toBe(
      "2026-03-08T07:30:00.000Z",
    );
  });

  it("a wall time repeated by fall-back resolves to the first (daylight time) occurrence", () => {
    // 2026-11-01: New York repeats 01:00-02:00 (EDT, then EST). 01:30 resolves to 05:30Z = 01:30 EDT.
    expect(zonedLocalToDate("2026-11-01T01:30", "America/New_York").toISOString()).toBe(
      "2026-11-01T05:30:00.000Z",
    );
    expect(zonedLocalToDate("2026-11-01T01:30", "America/Chicago").toISOString()).toBe(
      "2026-11-01T06:30:00.000Z",
    );
    // Times either side of the overlap are unaffected.
    expect(zonedLocalToDate("2026-11-01T00:30", "America/New_York").toISOString()).toBe(
      "2026-11-01T04:30:00.000Z",
    );
    expect(zonedLocalToDate("2026-11-01T02:30", "America/New_York").toISOString()).toBe(
      "2026-11-01T07:30:00.000Z",
    );
  });

  it("accepts seconds", () => {
    expect(zonedLocalToDate("2026-11-14T19:00:30", "UTC").toISOString()).toBe("2026-11-14T19:00:30.000Z");
  });

  it("rejects malformed or impossible values", () => {
    for (const bad of ["", "tomorrow", "2026-11-14", "2026-02-31T10:00", "2026-11-14T25:00"]) {
      expect(() => zonedLocalToDate(bad, "UTC")).toThrow(ValidationError);
    }
  });

  it("rejects an unknown time zone", () => {
    expect(() => zonedLocalToDate("2026-11-14T19:00", "Mars/Olympus")).toThrow(ValidationError);
    expect(() => assertTimeZone("")).toThrow(ValidationError);
  });
});
