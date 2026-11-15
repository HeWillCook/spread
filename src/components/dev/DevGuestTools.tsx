"use client";

import { useActionState } from "react";
import { INITIAL_DEV_FORM_STATE, type DevFormState } from "@/lib/dev-form";
import type { DevGuestLink } from "@/services/devGuests";
import { Button } from "../ui/Button";

export type DevFormAction = (prev: DevFormState, formData: FormData) => Promise<DevFormState>;

const STATUS_LABEL: Record<DevGuestLink["status"], string> = {
  yes: "Going",
  maybe: "Maybe",
  no: "Can't",
};

function Feedback({ state }: { state: DevFormState }) {
  if (state.error) {
    return (
      <p role="alert" className="text-sm font-bold text-ketchup-deep">
        {state.error}
      </p>
    );
  }
  if (state.message) {
    return (
      <p role="status" className="text-sm font-bold text-ink/80">
        {state.message}
      </p>
    );
  }
  return null;
}

const inputClass =
  "min-h-11 w-full rounded-xl border border-ink/55 bg-white px-3.5 py-2.5 text-base text-ink placeholder:text-ink-muted";

/**
 * Local-only guest lab. Mounted by the Guests tab only under `next dev`, so a
 * production build never ships a way to fake RSVPs.
 */
export function DevGuestTools({
  addGuestAction,
  addSampleAction,
  addCrowdAction,
  clearAction,
  links,
}: {
  addGuestAction: DevFormAction;
  addSampleAction: DevFormAction;
  addCrowdAction: DevFormAction;
  clearAction: DevFormAction;
  links: DevGuestLink[];
}) {
  const [addState, add, addPending] = useActionState(addGuestAction, INITIAL_DEV_FORM_STATE);
  const [sampleState, addSample, samplePending] = useActionState(
    addSampleAction,
    INITIAL_DEV_FORM_STATE,
  );
  const [crowdState, addCrowd, crowdPending] = useActionState(addCrowdAction, INITIAL_DEV_FORM_STATE);
  const [clearState, clear, clearPending] = useActionState(clearAction, INITIAL_DEV_FORM_STATE);

  return (
    <section
      aria-label="Developer tools"
      className="rounded-2xl border-2 border-dashed border-ink/30 bg-cream-deep/50 p-4 sm:p-5"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-bold">Guest lab</h2>
        <span className="text-xs font-medium text-ink-muted">
          Local dev only · skipped in production
        </span>
      </div>
      <p className="mt-1 max-w-prose text-sm text-ink/80">
        Create guests without opening a second browser. Everything here writes real RSVPs, so the
        headcount, menu, shopping list and split update exactly as they would in the wild.
      </p>

      <form action={add} className="mt-4 flex flex-col gap-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-bold">Name</span>
            <input name="name" className={inputClass} placeholder="Debug Guest" />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-bold">Answer</span>
            <select name="status" defaultValue="yes" className={inputClass}>
              <option value="yes">Yes, coming</option>
              <option value="maybe">Maybe</option>
              <option value="no">Can&apos;t come</option>
            </select>
          </label>
          <label className="flex flex-col gap-1.5 sm:col-span-2">
            <span className="text-sm font-bold">Plus-ones</span>
            <input name="plusOnes" className={inputClass} placeholder="Comma separated: Sam, Riley" />
          </label>
          <label className="flex flex-col gap-1.5 sm:col-span-2">
            <span className="text-sm font-bold">Food notes</span>
            <input name="foodNotes" className={inputClass} placeholder="Optional, host-only" />
          </label>
        </div>
        <div className="flex flex-wrap gap-4 text-sm">
          <label className="flex items-center gap-2">
            <input type="checkbox" name="attended" className="size-4 accent-ketchup" /> Attended
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" name="paid" className="size-4 accent-ketchup" /> Paid
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" name="excluded" className="size-4 accent-ketchup" /> Excluded from
            split
          </label>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="red" type="submit" disabled={addPending}>
            {addPending ? "Adding..." : "Add guest"}
          </Button>
          <Feedback state={addState} />
        </div>
      </form>

      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-dashed border-divider pt-4">
        <form action={addSample}>
          <Button variant="outline" type="submit" disabled={samplePending}>
            One of each
          </Button>
        </form>
        {[10, 25].map((count) => (
          <form key={count} action={addCrowd}>
            <input type="hidden" name="count" value={count} />
            <Button variant="outline" type="submit" disabled={crowdPending}>
              Add {count} guests
            </Button>
          </form>
        ))}
        <form
          action={clear}
          onSubmit={(event) => {
            if (!window.confirm("Remove every guest from this event?")) event.preventDefault();
          }}
        >
          <Button variant="outline" type="submit" disabled={clearPending}>
            Clear guests
          </Button>
        </form>
        <Feedback state={sampleState} />
        <Feedback state={crowdState} />
        <Feedback state={clearState} />
      </div>

      {links.length > 0 ? (
        <details className="mt-4 border-t border-dashed border-divider pt-3">
          <summary className="cursor-pointer text-sm font-bold">
            Guest links ({links.length})
          </summary>
          <p className="mt-1 text-xs text-ink/70">
            Open any guest&apos;s personal page to check their answered state.
          </p>
          <ul className="mt-2 flex flex-col gap-1 text-sm">
            {links.map((link) => (
              <li key={link.id} className="flex items-center justify-between gap-3">
                <span className="truncate">
                  {link.name}{" "}
                  <span className="text-xs text-ink/60">({STATUS_LABEL[link.status]})</span>
                </span>
                <a
                  href={link.url}
                  target="_blank"
                  rel="noreferrer"
                  className="shrink-0 font-bold underline underline-offset-2"
                >
                  Open
                </a>
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </section>
  );
}
