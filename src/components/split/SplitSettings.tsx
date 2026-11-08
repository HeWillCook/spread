"use client";

import { useActionState, useState } from "react";
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

/** "Add someone who came": a walk-in who never RSVPed, plus how many extra people they brought. */
export function WalkInForm({ action }: { action: SplitFormAction }) {
  const [state, formAction, pending] = useActionState(action, INITIAL_SPLIT_FORM_STATE);
  // Controlled, so a rejected save keeps what was typed (React resets uncontrolled fields).
  const [name, setName] = useState("");
  const [extra, setExtra] = useState("0");
  // Clear the fields once a save goes through.
  const [seenSaves, setSeenSaves] = useState(state.saves);
  if (state.saves !== seenSaves) {
    setSeenSaves(state.saves);
    setName("");
    setExtra("0");
  }
  return (
    <form action={formAction} className="flex flex-col gap-3">
      <h2 className="text-lg font-bold">Add someone who came</h2>
      <Field
        label="Name"
        name="name"
        autoComplete="off"
        maxLength={80}
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <Field
        label="Extra people they brought"
        hint="They count in the split like any other guest."
        name="plusOnes"
        type="number"
        inputMode="numeric"
        min={0}
        max={10}
        step={1}
        value={extra}
        onChange={(e) => setExtra(e.target.value)}
      />
      <FormError message={state.error} />
      <Button variant="outline" type="submit" disabled={pending}>
        {pending ? "Adding..." : "Add to the split"}
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
