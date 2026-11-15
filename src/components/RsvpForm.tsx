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
    <form action={formAction} className="mx-auto flex w-full max-w-lg flex-col gap-5 px-3 pb-14 pt-5 sm:px-5 sm:pt-10">
      <div className="px-2">
        <Wordmark />
      </div>
      {notice}

      <div className="ticket slip">
      <header className="slip-head">
        <p className="text-sm font-semibold text-ink-muted">
          <b className="font-semibold text-ink">{event.hostName}</b> is hosting
        </p>
        <h1 className="slip-title">{event.title}</h1>
        <p className="text-[1.0625rem] font-semibold text-ketchup-deep">{event.when}</p>
        <p className="text-sm text-ink-muted">
          {event.goingCount} going so far. A quick answer helps the host plan the food. No account needed.
        </p>
      </header>

      <div className="slip-body">

      <Field
        label="Your name"
        name="name"
        autoComplete="name"
        maxLength={80}
        required
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
              className="min-h-12 min-w-0 flex-1 rounded-xl border border-divider bg-white px-4 py-2 text-base text-ink placeholder:text-ink/65"
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
        <p className="text-xs text-ink-muted">
          Add a name so there&apos;s enough food for them too.
        </p>
      </fieldset>

      <Field
        label="Allergies or food notes"
        hint="Optional. Only your host can see these notes."
        name="foodNotes"
        maxLength={500}
        value={foodNotes}
        onChange={(e) => setFoodNotes(e.target.value)}
      />

      {state.error ? (
        <p
          role="alert"
          className="rounded-xl bg-ketchup px-4 py-3 text-sm font-bold text-paper"
        >
          {state.error}
        </p>
      ) : null}

      <Button variant="red" type="submit" disabled={!canSubmit} className="text-lg">
        {pending ? "Sending..." : initial ? "Update my answer" : status === "no" ? "Send my regrets" : status === "maybe" ? "Send my RSVP" : "Count me in"}
      </Button>
      <p className="text-center text-xs leading-relaxed text-ink-muted">You can come back on this device to change your answer.</p>
      </div>
      </div>
    </form>
  );
}
