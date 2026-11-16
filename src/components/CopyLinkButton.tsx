"use client";

import { useState } from "react";
import { Button } from "./ui/Button";

/**
 * Shows a guest link and copies it to the clipboard on tap. `compact` puts the
 * link and the button on one row for the dashboard tickets; the visible URL
 * truncates, while the full value stays in the DOM and on the title.
 */
export function CopyLinkButton({ url, compact = false }: { url: string; compact?: boolean }) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setState("copied");
    } catch {
      setState("failed");
    }
  }

  const label = state === "copied" ? "Copied!" : "Copy link";

  if (compact) {
    return (
      <div className="flex flex-col gap-1">
        <div className="flex min-w-0 items-center gap-1.5">
          <p
            className="min-w-0 flex-1 truncate rounded-md border border-divider bg-cream px-2 py-1 text-xs text-ink select-all"
            title={url}
          >
            {url}
          </p>
          <Button
            variant="outline"
            onClick={copy}
            aria-label={state === "copied" ? "Copied!" : "Copy link"}
            className="min-h-9 shrink-0 border-[1.5px] px-3 py-1 text-xs"
          >
            {label}
          </Button>
        </div>
        <p role="status" className="min-h-3 text-xs leading-tight text-ink/70">
          {state === "copied" ? "Paste it into your group chat." : null}
          {state === "failed" ? "Couldn't copy automatically. Press and hold the link to copy it." : null}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="break-all rounded-lg border border-divider bg-cream px-3 py-2 text-sm text-ink select-all">
        {url}
      </p>
      <Button variant="outline" onClick={copy} className="min-h-11 py-2 text-sm">
        {label}
      </Button>
      <p role="status" className="min-h-4 text-xs text-ink/70">
        {state === "copied" ? "Paste it into your group chat." : null}
        {state === "failed" ? "Couldn't copy automatically. Press and hold the link to copy it." : null}
      </p>
    </div>
  );
}
