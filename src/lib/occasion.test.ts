import { describe, expect, it } from "vitest";
import { OCCASIONS, OCCASION_THEMES, occasionFor, occasionHero, occasionSticker } from "./occasion";

describe("occasionFor", () => {
  it("maps every cover to its occasion", () => {
    expect(occasionFor("🎉")).toBe("party");
    expect(occasionFor("🍔")).toBe("cookout");
    expect(occasionFor("🎂")).toBe("birthday");
    expect(occasionFor("🍕")).toBe("pizzeria");
    expect(occasionFor("🌮")).toBe("fiesta");
    expect(occasionFor("🥂")).toBe("toast");
    expect(occasionFor("🎃")).toBe("harvest");
    expect(occasionFor("🎄")).toBe("holiday");
    expect(occasionFor("🧺")).toBe("picnic");
    expect(occasionFor("☕")).toBe("brunch");
    expect(occasionFor("🎲")).toBe("gamenight");
  });

  it("falls back to the picnic for no cover or an unknown one", () => {
    expect(occasionFor(null)).toBe("picnic");
    expect(occasionFor(undefined)).toBe("picnic");
    expect(occasionFor("🚀")).toBe("picnic");
  });

  it("has a label, sticker and accent for all eleven themes", () => {
    expect(OCCASION_THEMES).toHaveLength(11);
    expect(new Set(OCCASION_THEMES).size).toBe(11);
    for (const theme of OCCASION_THEMES) {
      expect(OCCASIONS[theme].label.length).toBeGreaterThan(0);
      expect(occasionSticker(theme).length).toBeGreaterThan(0);
      expect(occasionHero(theme).length).toBeGreaterThan(0);
      expect(OCCASIONS[theme].accent).toMatch(/^var\(--/);
    }
  });
});
