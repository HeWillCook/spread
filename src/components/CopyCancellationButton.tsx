"use client";

import { useState } from "react";
import { Button } from "./ui/Button";

/** The host copies this into their group chat; Spread never sends it. */
export function cancellationMessage(title: string, when: string): string {
  return `Sorry everyone, ${title} on ${when} is cancelled. Hope to see you at the next one.`;
}

/** Prepares a cancellation message for the host to send; never sends a message itself. */
export function CopyCancellationButton({ title, when }: { title: string; when: string }) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");
  const message = cancellationMessage(title, when);

  async function copy() {
    try {
      await navigator.clipboard.writeText(message);
      setState("copied");
    } catch {
      setState("failed");
    }
  }

  return (
    <div className="flex min-w-0 flex-col items-start gap-2">
      <Button
        variant="outline"
        onClick={copy}
        aria-label="Copy cancellation message"
        className="min-h-11 px-3 py-2 text-sm"
      >
        {state === "copied" ? "Copied!" : "Copy cancellation message"}
      </Button>
      {state !== "idle" ? (
        <p role="status" className="text-xs text-ink/80">
          {state === "copied"
            ? "Cancellation copied. Paste it into your group chat."
            : "Couldn't copy. Select the message below and copy it manually."}
        </p>
      ) : null}
      {state === "failed" ? (
        <textarea
          readOnly
          aria-label="Cancellation message"
          value={message}
          rows={4}
          onFocus={(e) => e.currentTarget.select()}
          className="w-full rounded-xl border border-divider bg-cream p-3 text-sm text-ink"
        />
      ) : null}
    </div>
  );
}
