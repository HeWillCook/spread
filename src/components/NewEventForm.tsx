"use client";

import Link from "next/link";
import { useActionState, useSyncExternalStore } from "react";
import { Button } from "./ui/Button";
import { Card } from "./ui/Card";
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
    <main className="mx-auto flex w-full max-w-md flex-col gap-5 p-5">
      <Wordmark />
      <header className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold leading-tight text-ink">New cookout</h1>
        <p className="text-sm text-ink/80">You&apos;ll get a link to share with your guests.</p>
      </header>

      <Card>
        <form action={formAction} className="flex flex-col gap-4">
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

          {state.error ? (
            <p
              role="alert"
              className="rounded-xl border-2 border-ink bg-ketchup px-4 py-3 text-sm font-bold text-cream"
            >
              {state.error}
            </p>
          ) : null}

          <Button
            variant="mustard"
            type="submit"
            disabled={!timeZone || pending}
            className="text-lg"
          >
            {pending ? "Creating..." : "Create event"}
          </Button>
        </form>
      </Card>

      <p className="text-center text-sm">
        <Link href="/host" className="font-bold text-ketchup underline">
          Back to my events
        </Link>
      </p>
    </main>
  );
}
