"use client";

import { useState } from "react";
import { Button } from "./ui/Button";

/** Shows a guest link and copies it to the clipboard on tap. */
export function CopyLinkButton({ url }: { url: string }) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setState("copied");
    } catch {
      setState("failed");
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="break-all rounded-lg border border-divider bg-cream px-3 py-2 text-sm text-ink select-all">
        {url}
      </p>
      <Button variant="outline" onClick={copy} className="min-h-11 py-2 text-sm">
        {state === "copied" ? "Copied!" : "Copy link"}
      </Button>
      <p role="status" className="min-h-4 text-xs text-ink/70">
        {state === "copied" ? "Paste it into your group chat." : null}
        {state === "failed" ? "Couldn't copy automatically. Press and hold the link to copy it." : null}
      </p>
    </div>
  );
}
