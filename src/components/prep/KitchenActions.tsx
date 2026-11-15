"use client";

import { useState } from "react";
import { Button } from "../ui/Button";

/**
 * Copy and print controls for the saved kitchen sheet. Copying uses the clipboard
 * only when the browser actually provides it; otherwise the full text stays on
 * screen in a selectable textarea. Printing calls the browser's own print dialog.
 */
export function KitchenActions({ text }: { text: string }) {
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");
  const [printError, setPrintError] = useState<string | null>(null);

  async function copy() {
    setPrintError(null);
    try {
      const clipboard = navigator.clipboard;
      if (!clipboard || typeof clipboard.writeText !== "function") {
        throw new Error("Clipboard unavailable");
      }
      await clipboard.writeText(text);
      setCopyState("copied");
    } catch {
      setCopyState("failed");
    }
  }

  function print() {
    setPrintError(null);
    if (typeof window === "undefined" || typeof window.print !== "function") {
      setPrintError("Printing isn't available in this browser. Use Copy kitchen sheet instead.");
      return;
    }
    try {
      window.print();
    } catch {
      setPrintError("Printing isn't available in this browser. Use Copy kitchen sheet instead.");
    }
  }

  return (
    <div className="kitchen-action-controls flex min-w-0 flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="red" onClick={copy}>
          Copy kitchen sheet
        </Button>
        <Button variant="outline" onClick={print}>
          Print kitchen sheet
        </Button>
      </div>

      <p role="status" aria-live="polite" className="kitchen-copy-status min-h-4 text-sm text-ink/80">
        {copyState === "copied" ? "Kitchen sheet copied. Paste it wherever you need it." : null}
        {copyState === "failed"
          ? "Couldn't copy automatically. Select the text below and copy it manually."
          : null}
      </p>

      {printError ? (
        <p role="alert" className="kitchen-print-error text-sm font-bold text-ketchup">
          {printError}
        </p>
      ) : null}

      {copyState === "failed" ? (
        <textarea
          readOnly
          aria-label="Kitchen sheet text"
          value={text}
          rows={14}
          onFocus={(event) => event.currentTarget.select()}
          className="kitchen-copy-fallback w-full rounded-xl border border-divider bg-cream p-3 text-sm leading-relaxed text-ink"
        />
      ) : null}
    </div>
  );
}
