"use client";

import { useState } from "react";
import { EmberBurst } from "./fire/EmberBurst";
import { FlameIcon } from "./fire/FlameIcon";
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
}: {
  title: string;
  /** Pre-formatted day and time, e.g. "Sat, Nov 14 · 7pm". */
  when: string;
  location: string;
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
      <EmberBurst />
      <p className="relative flex items-start gap-2 text-sm font-bold leading-relaxed text-ink">
        <FlameIcon size="sm" className="mt-0.5 shrink-0" />
        <span>{message}</span>
      </p>
      <p className="text-xs leading-relaxed text-ink-muted">
        Copy this into your group chat. Spread doesn&apos;t message guests for you.
      </p>
      <Button
        variant="outline"
        onClick={copy}
        aria-label="Copy heads-up message"
        className="min-h-11 px-3 py-2 text-sm"
      >
        {state === "copied" ? "Copied!" : "Copy heads-up message"}
      </Button>
      {state !== "idle" ? (
        <p role="status" className="text-xs text-ink/80">
          {state === "copied"
            ? "Heads-up copied. Paste it into your group chat."
            : "Couldn't copy. Select the message above and copy it manually."}
        </p>
      ) : null}
    </div>
  );
}
