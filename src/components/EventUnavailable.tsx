import { Wordmark } from "./ui/Wordmark";

/**
 * What a guest sees for an event the host has deleted: a friendly slip, not a
 * 404, so a stale link doesn't look like a broken site. No event details beyond
 * the host's name, since the event is on its way out.
 */
export function EventUnavailable({ hostName }: { hostName: string }) {
  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-5 px-3 pb-14 pt-5 sm:px-5 sm:pt-10">
      <div className="px-2">
        <Wordmark />
      </div>
      <div className="ticket slip">
        <header className="slip-head">
          <h1 className="slip-title">This event is no longer available</h1>
          <p className="text-sm leading-relaxed text-ink-muted">
            <b className="font-semibold text-ink">{hostName}</b> took this event down. Ask them
            for a new link if you think you should still have one.
          </p>
        </header>
      </div>
    </main>
  );
}
