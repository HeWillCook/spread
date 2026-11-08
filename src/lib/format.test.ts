import { describe, expect, it } from "vitest";
import { formatWhen } from "./format";

describe("formatWhen", () => {
  it("formats weekday, hour and location", () => {
    expect(formatWhen(new Date(2026, 10, 14, 19, 0), "Will's backyard")).toBe(
      "Sat · 7pm · Will's backyard",
    );
  });

  it("keeps minutes when not on the hour", () => {
    expect(formatWhen(new Date(2026, 10, 14, 12, 30), "Park")).toBe("Sat · 12:30pm · Park");
  });

  it("skips an empty location", () => {
    expect(formatWhen(new Date(2026, 10, 14, 19, 0), "")).toBe("Sat · 7pm");
  });
});
