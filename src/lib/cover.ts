/**
 * Event covers: one preset emoji on one palette colour, chosen when the host
 * creates or edits an event. Values are validated server-side against these
 * lists, so a cover is always printable from a `bg-*` class Tailwind can see.
 */

export interface CoverChoice {
  emoji: string;
  label: string;
}

export const COVERS: readonly CoverChoice[] = [
  { emoji: "🎉", label: "Party popper" },
  { emoji: "🍔", label: "Burger" },
  { emoji: "🎂", label: "Birthday cake" },
  { emoji: "🍕", label: "Pizza" },
  { emoji: "🌮", label: "Taco" },
  { emoji: "🥂", label: "Clinking glasses" },
  { emoji: "🎃", label: "Pumpkin" },
  { emoji: "🎄", label: "Christmas tree" },
];

/** The emoji as a non-empty tuple, ready for `z.enum`. */
export const COVER_EMOJI = COVERS.map((cover) => cover.emoji) as [string, ...string[]];

export interface CoverColorChoice {
  /** Stored on `events.coverColor` and sent by the picker. */
  key: string;
  label: string;
  /** One of the palette classes from globals.css. */
  className: string;
}

export const COVER_COLORS: readonly CoverColorChoice[] = [
  { key: "mustard", label: "Mustard", className: "bg-mustard" },
  { key: "ketchup", label: "Ketchup", className: "bg-ketchup" },
  { key: "pickle", label: "Pickle", className: "bg-pickle" },
  { key: "cream-deep", label: "Peach", className: "bg-cream-deep" },
  { key: "ink", label: "Charcoal", className: "bg-ink" },
  { key: "pickle-soft", label: "Sage", className: "bg-pickle-soft" },
];

/** Colour keys as a non-empty tuple, ready for `z.enum`. */
export const COVER_COLOR_KEYS = COVER_COLORS.map((color) => color.key) as [
  string,
  ...string[],
];

export const DEFAULT_COVER_EMOJI = "🎉";
export const DEFAULT_COVER_COLOR = "mustard";

/** What every screen renders for an event with no cover (or an unknown one). */
export interface Cover {
  emoji: string;
  /** Accessible name for the emoji, e.g. "Party popper". */
  emojiLabel: string;
  color: string;
  className: string;
}

const DEFAULT_EMOJI_CHOICE =
  COVERS.find((cover) => cover.emoji === DEFAULT_COVER_EMOJI) ?? COVERS[0];
const DEFAULT_COLOR_CHOICE =
  COVER_COLORS.find((color) => color.key === DEFAULT_COVER_COLOR) ?? COVER_COLORS[0];

/** Resolves stored (possibly null) cover values to the preset to render. */
export function coverFor(event: {
  coverEmoji?: string | null;
  coverColor?: string | null;
}): Cover {
  const emoji =
    COVERS.find((cover) => cover.emoji === event.coverEmoji) ?? DEFAULT_EMOJI_CHOICE;
  const color =
    COVER_COLORS.find((choice) => choice.key === event.coverColor) ?? DEFAULT_COLOR_CHOICE;
  return {
    emoji: emoji.emoji,
    emojiLabel: emoji.label,
    color: color.key,
    className: color.className,
  };
}
