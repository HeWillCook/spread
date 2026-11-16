import type { StickerName } from "@/components/scrapbook/Sticker";

export const OCCASION_THEMES = [
  "party",
  "cookout",
  "birthday",
  "pizzeria",
  "fiesta",
  "toast",
  "harvest",
  "holiday",
  "picnic",
  "brunch",
  "gamenight",
] as const;

export type OccasionTheme = (typeof OCCASION_THEMES)[number];

export interface Occasion {
  /** Human label for the theme, used in examples and documentation. */
  label: string;
  /** The matching sticker from the scrapbook set. */
  sticker: StickerName;
  /** Accent for the active event tab and small theme details. */
  accent: string;
}

export const OCCASIONS: Record<OccasionTheme, Occasion> = {
  party: { label: "Party", sticker: "balloon", accent: "var(--ketchup)" },
  cookout: { label: "Cookout", sticker: "burger", accent: "var(--ember)" },
  birthday: { label: "Birthday", sticker: "cake", accent: "var(--mustard-deep)" },
  pizzeria: { label: "Pizzeria", sticker: "pizza", accent: "var(--ketchup-deep)" },
  fiesta: { label: "Fiesta", sticker: "taco", accent: "var(--mustard-deep)" },
  toast: { label: "Toast", sticker: "glasses", accent: "var(--mustard-deep)" },
  harvest: { label: "Harvest", sticker: "pumpkin", accent: "var(--ember)" },
  holiday: { label: "Holiday", sticker: "tree", accent: "var(--pickle)" },
  picnic: { label: "Picnic", sticker: "basket", accent: "var(--pickle)" },
  brunch: { label: "Brunch", sticker: "mug", accent: "var(--ink-muted)" },
  gamenight: { label: "Game night", sticker: "dice", accent: "var(--ketchup-deep)" },
};

const THEME_BY_COVER: Record<string, OccasionTheme> = {
  "🎉": "party",
  "🍔": "cookout",
  "🎂": "birthday",
  "🍕": "pizzeria",
  "🌮": "fiesta",
  "🥂": "toast",
  "🎃": "harvest",
  "🎄": "holiday",
  "🧺": "picnic",
  "☕": "brunch",
  "🎲": "gamenight",
};

/** The occasion behind an event cover. Unknown or missing covers are a picnic. */
export function occasionFor(coverEmoji: string | null | undefined): OccasionTheme {
  return (coverEmoji && THEME_BY_COVER[coverEmoji]) || "picnic";
}

export function occasionAccent(theme: OccasionTheme): string {
  return OCCASIONS[theme].accent;
}

export function occasionSticker(theme: OccasionTheme): StickerName {
  return OCCASIONS[theme].sticker;
}
