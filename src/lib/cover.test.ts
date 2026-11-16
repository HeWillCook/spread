import { describe, expect, it } from "vitest";
import {
  COVER_COLOR_KEYS,
  COVER_COLORS,
  COVER_EMOJI,
  COVERS,
  coverFor,
  DEFAULT_COVER_COLOR,
  DEFAULT_COVER_EMOJI,
} from "./cover";

describe("coverFor", () => {
  it("falls back to 🎉 and mustard when the event has no cover", () => {
    expect(coverFor({ coverEmoji: null, coverColor: null })).toEqual({
      emoji: DEFAULT_COVER_EMOJI,
      emojiLabel: "Party popper",
      color: DEFAULT_COVER_COLOR,
      className: "bg-mustard",
    });
    expect(coverFor({})).toMatchObject({
      emoji: DEFAULT_COVER_EMOJI,
      color: DEFAULT_COVER_COLOR,
    });
  });

  it("resolves a stored preset to its label and palette class", () => {
    expect(coverFor({ coverEmoji: "🍕", coverColor: "pickle" })).toEqual({
      emoji: "🍕",
      emojiLabel: "Pizza",
      color: "pickle",
      className: "bg-pickle",
    });
  });

  it("ignores values outside the preset lists", () => {
    expect(coverFor({ coverEmoji: "🚀", coverColor: "neon" })).toMatchObject({
      emoji: DEFAULT_COVER_EMOJI,
      color: DEFAULT_COVER_COLOR,
    });
  });

  it("exposes every preset once for the picker and server validation", () => {
    expect(COVER_EMOJI).toHaveLength(8);
    expect(new Set(COVER_EMOJI).size).toBe(8);
    expect(COVERS.map((cover) => cover.emoji)).toEqual(COVER_EMOJI);
    expect(COVER_COLOR_KEYS).toHaveLength(6);
    expect(new Set(COVER_COLOR_KEYS).size).toBe(6);
    for (const color of COVER_COLORS) {
      expect(color.className).toMatch(/^bg-/);
    }
  });
});
