"use client";

import { useState } from "react";
import { COVER_COLORS, COVERS, coverFor } from "@/lib/cover";

/**
 * A radio group for the event cover: one emoji and one palette colour. State
 * lives here so a rejected save keeps the host's choice. Every option is a
 * native radio with an accessible label ("Party popper", "Mustard").
 */
export function CoverPicker({
  initialEmoji,
  initialColor,
  onEmojiChange,
}: {
  initialEmoji?: string | null;
  initialColor?: string | null;
  /** Optional live preview hook for the new-event page. */
  onEmojiChange?: (emoji: string) => void;
}) {
  const initial = coverFor({ coverEmoji: initialEmoji, coverColor: initialColor });
  const [emoji, setEmoji] = useState(initial.emoji);
  const [color, setColor] = useState(initial.color);

  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="text-sm font-bold text-ink">Cover</legend>

      <div className="flex flex-wrap gap-1.5">
        {COVERS.map((cover) => (
          <label key={cover.emoji} className="cursor-pointer">
            <input
              type="radio"
              name="coverEmoji"
              value={cover.emoji}
              checked={emoji === cover.emoji}
              onChange={() => {
                setEmoji(cover.emoji);
                onEmojiChange?.(cover.emoji);
              }}
              aria-label={cover.label}
              className="peer sr-only"
            />
            <span
              aria-hidden
              className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-cream/60 text-2xl ring-1 ring-inset ring-ink/15 peer-checked:ring-2 peer-checked:ring-ink peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ink"
            >
              {cover.emoji}
            </span>
          </label>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {COVER_COLORS.map((choice) => (
          <label key={choice.key} className="cursor-pointer">
            <input
              type="radio"
              name="coverColor"
              value={choice.key}
              checked={color === choice.key}
              onChange={() => setColor(choice.key)}
              aria-label={choice.label}
              className="peer sr-only"
            />
            <span
              aria-hidden
              className={`block h-11 w-11 rounded-full ring-1 ring-inset ring-ink/15 peer-checked:ring-2 peer-checked:ring-ink peer-checked:ring-offset-2 peer-checked:ring-offset-paper peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ink ${choice.className}`}
            />
          </label>
        ))}
      </div>
    </fieldset>
  );
}
