import type { ReactNode } from "react";

/**
 * The cancellation notice shared by the guest slip and the host masthead.
 * Ketchup marks it as the one thing to read first; nothing here takes actions.
 */
export function CancelledEventNotice({
  hostName,
  children,
}: {
  /** Guests see "Cancelled by <host>"; the host's own screens leave it off. */
  hostName?: string;
  children?: ReactNode;
}) {
  return (
    <div
      role="status"
      className="flex flex-col gap-1.5 rounded-2xl border-[1.5px] border-ketchup bg-paper px-5 py-4 text-ink"
    >
      <p className="font-display text-xl leading-tight text-ketchup">
        {hostName ? <>Cancelled by {hostName}</> : "Cancelled"}
      </p>
      {children ?? (
        <p className="text-sm leading-relaxed text-ink-muted">
          This event was called off, so RSVPs are closed.
        </p>
      )}
    </div>
  );
}
