"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { Button } from "./ui/Button";
import { Card } from "./ui/Card";
import { Field } from "./ui/Field";

export interface EditEventState {
  error: string | null;
}

export type EditEventAction = (
  prev: EditEventState,
  formData: FormData,
) => Promise<EditEventState>;

export interface EditEventInitial {
  title: string;
  /** `datetime-local` value in the event's own zone, e.g. "2026-11-14T19:00". */
  startsAt: string;
  location: string;
  /** IANA zone the time above is in; it stays the same when saving. */
  timezone: string;
}

export function EditEventForm({
  initial,
  action,
  backHref,
}: {
  initial: EditEventInitial;
  action: EditEventAction;
  backHref: string;
}) {
  const [state, formAction, pending] = useActionState(action, { error: null });
  // Controlled, so a rejected save keeps what the host typed (React resets uncontrolled fields).
  const [title, setTitle] = useState(initial.title);
  const [startsAt, setStartsAt] = useState(initial.startsAt);
  const [location, setLocation] = useState(initial.location);

  return (
    <Card>
      <form action={formAction} className="flex flex-col gap-4">
        <input type="hidden" name="timezone" value={initial.timezone} />
        <Field
          label="What's the occasion?"
          name="title"
          maxLength={100}
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <Field
          label="Date and time"
          name="startsAt"
          type="datetime-local"
          required
          hint={`Time in ${initial.timezone}`}
          value={startsAt}
          onChange={(e) => setStartsAt(e.target.value)}
        />
        <Field
          label="Where?"
          name="location"
          maxLength={200}
          required
          value={location}
          onChange={(e) => setLocation(e.target.value)}
        />

        {state.error ? (
          <p
            role="alert"
            className="rounded-xl bg-ketchup px-4 py-3 text-sm font-bold text-paper"
          >
            {state.error}
          </p>
        ) : null}

        <Button variant="red" type="submit" disabled={pending} className="text-lg">
          {pending ? "Saving..." : "Save changes"}
        </Button>
        <p className="text-center text-sm">
          <Link href={backHref} className="font-bold text-ketchup underline">
            Cancel
          </Link>
        </p>
      </form>
    </Card>
  );
}
