"use client";

import { useActionState, useState, type ReactNode } from "react";
import type { RsvpStatus } from "@/domain/headcount";
import type { GuestView } from "@/services/rsvp";
import { Button } from "./ui/Button";
import { Field } from "./ui/Field";
import { Wordmark } from "./ui/Wordmark";

export const MAX_PLUS_ONES = 10;

/** Event details safe to show a guest. `when` is pre-formatted on the server. */
export interface RsvpFormEvent {
  title: string;
  when: string;
  hostName: string;
  goingCount: number;
}

export interface RsvpFormState {
  error: string | null;
}

export type RsvpFormAction = (
  prev: RsvpFormState,
  formData: FormData,
) => Promise<RsvpFormState>;

const ANSWERS: { status: RsvpStatus; label: string }[] = [
  { status: "yes", label: "Yes!" },
  { status: "maybe", label: "Maybe" },
  { status: "no", label: "Can't" },
];

export function RsvpForm({
  event,
  initial,
  action,
  notice,
}: {
  event: RsvpFormEvent;
  initial?: GuestView;
  action: RsvpFormAction;
  /** Optional banner shown under the wordmark (e.g. the confirmation). */
  notice?: ReactNode;
}) {
  const [state, formAction, pending] = useActionState(action, { error: null });
  const [name, setName] = useState(initial?.name ?? "");
  const [status, setStatus] = useState<RsvpStatus | null>(initial?.status ?? null);
  const [plusOnes, setPlusOnes] = useState<string[]>(initial?.plusOneNames ?? []);
  const [foodNotes, setFoodNotes] = useState(initial?.foodNotes ?? "");

  const canSubmit = name.trim().length > 0 && status !== null && !pending;

  return (
    <form action={formAction} className="mx-auto flex w-full max-w-md flex-col gap-5 p-5">
      <Wordmark />
      {notice}

      <header className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold leading-tight text-ink">{event.title}</h1>
        <p className="text-base font-bold text-ketchup">{event.when}</p>
        <p className="text-sm text-ink/80">
          Hosted by <b>{event.hostName}</b> · {event.goingCount} going so far
        </p>
      </header>

      <Field
        label="Your name"
        name="name"
        autoComplete="name"
        maxLength={80}
        value={name}
        onChange={(e) => setName(e.target.value)}
      />

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-sm font-bold text-ink">Are you coming?</legend>
        <input type="hidden" name="status" value={status ?? ""} />
        <div className="grid grid-cols-3 gap-2">
          {ANSWERS.map(({ status: value, label }) => (
            <Button
              key={value}
              variant={status === value ? "red" : "outline"}
              aria-pressed={status === value}
              onClick={() => setStatus(value)}
              className="text-lg"
            >
              {label}
            </Button>
          ))}
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-sm font-bold text-ink">Bringing anyone?</legend>
        {plusOnes.map((value, i) => (
          <div key={i} className="flex gap-2">
            <input
              name="plusOne"
              aria-label={`Guest ${i + 1} name`}
              placeholder="Their name"
              maxLength={80}
              value={value}
              onChange={(e) =>
                setPlusOnes((list) => list.map((n, j) => (j === i ? e.target.value : n)))
              }
              className="min-h-12 min-w-0 flex-1 rounded-xl border-2 border-ink bg-white px-4 py-2 text-base text-ink placeholder:text-ink/40"
            />
            <Button
              variant="outline"
              aria-label={`Remove guest ${i + 1}`}
              onClick={() => setPlusOnes((list) => list.filter((_, j) => j !== i))}
            >
              ✕
            </Button>
          </div>
        ))}
        {plusOnes.length < MAX_PLUS_ONES ? (
          <Button
            variant="outline"
            onClick={() => setPlusOnes((list) => [...list, ""])}
            className="border-dashed"
          >
            + add a guest
          </Button>
        ) : null}
        <p className="text-xs text-ink/70">
          Add a name so there&apos;s enough food for them too.
        </p>
      </fieldset>

      <Field
        label="Allergies or food notes"
        name="foodNotes"
        maxLength={500}
        value={foodNotes}
        onChange={(e) => setFoodNotes(e.target.value)}
      />

      {state.error ? (
        <p
          role="alert"
          className="rounded-xl border-2 border-ink bg-ketchup px-4 py-3 text-sm font-bold text-cream"
        >
          {state.error}
        </p>
      ) : null}

      <Button variant="mustard" type="submit" disabled={!canSubmit} className="text-lg">
        {initial ? "Update my answer" : "Count me in"}
      </Button>
    </form>
  );
}
