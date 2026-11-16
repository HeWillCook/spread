"use client";

import { useState } from "react";
import type { OccasionTheme } from "@/lib/occasion";
import { occasionSticker } from "@/lib/occasion";
import { OccasionBurst } from "./occasion/OccasionBurst";
import { Sticker } from "./scrapbook/Sticker";
import { Button } from "./ui/Button";

/** The sentence the host pastes into their group chat; Spread never sends it. */
export function changeNoticeMessage(title: string, when: string, location: string): string {
  return `Heads up: ${title} is now ${when} at ${location}`;
}

/**
 * Shown on the Guests tab right after a time or place change, so the host can
 * tell everyone in their own chat.
 */
export function ChangeNotice({
  title,
  when,
  location,
  theme = "party",
}: {
  title: string;
  /** Pre-formatted day and time, e.g. "Sat, Nov 14 · 7pm". */
  when: string;
  location: string;
  /** The event's occasion, for the sticker and the one-time burst. */
  theme?: OccasionTheme;
}) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");
  const message = changeNoticeMessage(title, when, location);

  async function copy() {
    try {
      await navigator.clipboard.writeText(message);
      setState("copied");
    } catch {
      setState("failed");
    }
  }

  return (
    <div className="relative flex min-w-0 flex-col items-start gap-2">
      <OccasionBurst theme={theme} />
      <div className="relative z-[1] flex items-start gap-2">
        <Sticker name={occasionSticker(theme)} size="sm" className="mt-0.5 shrink-0" />
        <p className="text-sm font-bold leading-relaxed text-ink">{message}</p>
      </div>
      <p className="relative z-[1] text-xs leading-relaxed text-ink-muted">
        Copy this into your group chat. Spread doesn&apos;t message guests for you.
      </p>
      <Button
        variant="outline"
        onClick={copy}
        aria-label="Copy heads-up message"
        className="relative z-[1] min-h-11 px-3 py-2 text-sm"
      >
        {state === "copied" ? "Copied!" : "Copy heads-up message"}
      </Button>
      {state !== "idle" ? (
        <p role="status" className="relative z-[1] text-xs text-ink/80">
          {state === "copied"
            ? "Heads-up copied. Paste it into your group chat."
            : "Couldn't copy. Select the message above and copy it manually."}
        </p>
      ) : null}
    </div>
  );
}
