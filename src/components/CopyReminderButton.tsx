"use client";

import { useState } from "react";
import { Button } from "./ui/Button";

/** Prepares a personal message for the host to send; never sends a message itself. */
export function CopyReminderButton({ name, title, url }: { name: string; title: string; url: string }) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");
  const message = `Hi ${name}! Can you let me know if you're coming to ${title}? It helps me plan the food. RSVP here: ${url}`;

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
      <Button variant="outline" onClick={copy} aria-label={`Copy reminder for ${name}`} className="min-h-11 px-3 py-2 text-sm">
        {state === "copied" ? "Copied!" : "Copy reminder"}
      </Button>
      {state !== "idle" ? (
        <p role="status" className="text-xs text-ink/80">
          {state === "copied" ? "Reminder copied. Paste it into your chat with them." : "Couldn't copy. Select the message below and copy it manually."}
        </p>
      ) : null}
      {state === "failed" ? (
        <textarea
          readOnly
          aria-label={`Reminder message for ${name}`}
          value={message}
          rows={5}
          onFocus={(e) => e.currentTarget.select()}
          className="w-full rounded-xl border border-divider bg-cream p-3 text-sm text-ink"
        />
      ) : null}
    </div>
  );
}
