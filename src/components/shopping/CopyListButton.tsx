"use client";

import { useEffect, useState } from "react";
import { Button } from "../ui/Button";

/** How long "Copied!" stays up before the button resets. */
const FEEDBACK_MS = 2000;

/**
 * Copies the plain-text shopping list. Feedback clears itself after two seconds;
 * a blocked clipboard says so rather than pretending the copy worked.
 */
export function CopyListButton({ text }: { text: string }) {
  const [feedback, setFeedback] = useState<{ status: "copied" | "failed"; at: number } | null>(null);

  useEffect(() => {
    if (!feedback) return;
    const timer = window.setTimeout(() => setFeedback(null), FEEDBACK_MS);
    return () => window.clearTimeout(timer);
  }, [feedback]);

  async function copy() {
    try {
      if (typeof navigator === "undefined" || typeof navigator.clipboard?.writeText !== "function") {
        throw new Error("clipboard unavailable");
      }
      await navigator.clipboard.writeText(text);
      setFeedback({ status: "copied", at: Date.now() });
    } catch {
      setFeedback({ status: "failed", at: Date.now() });
    }
  }

  const copied = feedback?.status === "copied";

  return (
    <div className="flex flex-col gap-1">
      <Button variant="outline" onClick={copy} className="min-h-10 px-4 py-1.5 text-sm">
        {copied ? "Copied!" : "Copy list"}
      </Button>
      <p role="status" className="min-h-3 text-xs leading-tight text-ink/70">
        {copied ? "Paste it into your notes or a message." : null}
        {feedback?.status === "failed"
          ? "Couldn't copy automatically. Select the list and copy it by hand."
          : null}
      </p>
    </div>
  );
}
