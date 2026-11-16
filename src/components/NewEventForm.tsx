"use client";

import Link from "next/link";
import { useActionState, useSyncExternalStore } from "react";
import { CoverPicker } from "./CoverPicker";
import { Button } from "./ui/Button";
import { Field } from "./ui/Field";
import { Wordmark } from "./ui/Wordmark";

export interface NewEventState {
  error: string | null;
}

export type NewEventAction = (prev: NewEventState, formData: FormData) => Promise<NewEventState>;

const noopSubscribe = () => () => {};

/** The browser's IANA time zone; "" while server-rendering / before hydration. */
function useBrowserTimeZone(): string {
  return useSyncExternalStore(
    noopSubscribe,
    () => Intl.DateTimeFormat().resolvedOptions().timeZone ?? "",
    () => "",
  );
}

export function NewEventForm({ action }: { action: NewEventAction }) {
  const [state, formAction, pending] = useActionState(action, { error: null });
  // The date/time the host types is wall-clock time in THEIR zone; send the zone
  // along so guests see the same hour whatever zone the server runs in. The
  // button stays disabled until it is known (i.e. until hydration).
  const timeZone = useBrowserTimeZone();

  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-5 px-3 pb-14 pt-5 sm:pt-14">
      <div className="px-2">
        <Wordmark />
      </div>

      <div className="ticket slip">
      <header className="slip-head">
        <h1 className="text-[2.25rem] leading-none">New event</h1>
        <p className="text-sm text-ink-muted">You&apos;ll get a link to share with your guests.</p>
      </header>
        <form action={formAction} className="slip-body">
          <input type="hidden" name="timezone" value={timeZone} />
          <Field
            label="What's the occasion?"
            name="title"
            maxLength={100}
            required
            placeholder="Fourth of July cookout"
          />
          <Field label="Date and time" name="startsAt" type="datetime-local" required />
          <Field
            label="Where?"
            name="location"
            maxLength={200}
            required
            placeholder="Will's backyard"
          />
          <CoverPicker />

          {state.error ? (
            <p
              role="alert"
              className="rounded-xl bg-ketchup px-4 py-3 text-sm font-bold text-paper"
            >
              {state.error}
            </p>
          ) : null}

          <Button
            variant="red"
            type="submit"
            disabled={!timeZone || pending}
            className="text-lg"
          >
            {pending ? "Creating..." : "Create event"}
          </Button>
        </form>
      </div>

      <p className="text-center text-sm">
        <Link href="/host" className="font-bold text-ketchup underline">
          Back to my events
        </Link>
      </p>
    </main>
  );
}
