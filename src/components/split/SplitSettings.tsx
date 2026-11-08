"use client";

import { useActionState } from "react";
import { FormError } from "../menu/menuForm";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { Field } from "../ui/Field";
import { coverToInput, INITIAL_SPLIT_FORM_STATE, type SplitFormAction } from "./splitForm";

function CoverForm({ cents, action }: { cents: number; action: SplitFormAction }) {
  const [state, formAction, pending] = useActionState(action, INITIAL_SPLIT_FORM_STATE);
  return (
    <form action={formAction} className="flex flex-col gap-3">
      <Field
        label="You cover ($)"
        hint="Comes off the bill before it's split. Leave blank to split it all."
        name="cover"
        type="text"
        inputMode="decimal"
        autoComplete="off"
        placeholder="0.00"
        defaultValue={coverToInput(cents)}
      />
      <FormError message={state.error} />
      <Button variant="outline" type="submit" disabled={pending}>
        {pending ? "Saving..." : "Save"}
      </Button>
    </form>
  );
}

function VenmoForm({ username, action }: { username: string | null; action: SplitFormAction }) {
  const [state, formAction, pending] = useActionState(action, INITIAL_SPLIT_FORM_STATE);
  return (
    <form action={formAction} className="flex flex-col gap-3">
      <Field
        label="Your Venmo username"
        hint="Guests' links pay you. Add it to get a Send Venmo link for each guest."
        name="username"
        type="text"
        autoComplete="off"
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        maxLength={31}
        placeholder="@yourname"
        defaultValue={username ?? ""}
      />
      <FormError message={state.error} />
      <Button variant="outline" type="submit" disabled={pending}>
        {pending ? "Saving..." : "Save"}
      </Button>
    </form>
  );
}

/** Host-cover and Venmo-username fields. */
export function SplitSettings({
  hostCoverCents,
  venmoUsername,
  coverAction,
  venmoAction,
}: {
  /** What the host entered, even if it is more than the bill. */
  hostCoverCents: number;
  venmoUsername: string | null;
  coverAction: SplitFormAction;
  venmoAction: SplitFormAction;
}) {
  return (
    <Card className="flex flex-col gap-5">
      {/* Re-keyed on the saved value so the box shows what the server kept. */}
      <CoverForm key={`cover:${hostCoverCents}`} cents={hostCoverCents} action={coverAction} />
      <VenmoForm key={`venmo:${venmoUsername ?? ""}`} username={venmoUsername} action={venmoAction} />
    </Card>
  );
}
