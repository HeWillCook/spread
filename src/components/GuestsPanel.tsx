"use client";

import { useActionState, useState } from "react";
import { duplicateGuestIds } from "@/lib/guest-names";
import type { GuestsOverview, GuestRow } from "@/services/guestsOverview";
import { Button } from "./ui/Button";
import { Card, CardRow } from "./ui/Card";
import { Field } from "./ui/Field";
import { Pill } from "./ui/Pill";

export interface GuestsFormState {
  error: string | null;
}

export type GuestsFormAction = (
  prev: GuestsFormState,
  formData: FormData,
) => Promise<GuestsFormState>;

const STATUS_LABEL: Record<GuestRow["status"], string> = {
  yes: "Going",
  maybe: "Maybe",
  no: "Can't",
};

function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p
      role="alert"
      className="rounded-xl border-2 border-ink bg-ketchup px-4 py-3 text-sm font-bold text-cream"
    >
      {message}
    </p>
  );
}

/**
 * "12 confirmed + about 3 from maybes = plan for ~15 (range 12–17)". With no maybes
 * to add it drops those parts: "12 confirmed = plan for ~12"; the range is only shown
 * when it isn't a single number.
 */
export function breakdownLine(headcount: GuestsOverview["headcount"]): string {
  const { confirmed, planFor, low, high } = headcount;
  const fromMaybes = planFor - confirmed;
  const head = fromMaybes > 0 ? `${confirmed} confirmed + about ${fromMaybes} from maybes` : `${confirmed} confirmed`;
  const range = low === high ? "" : ` (range ${low}–${high})`;
  return `${head} = plan for ~${planFor}${range}`;
}

function MaybePercentForm({ action, percent }: { action: GuestsFormAction; percent: number }) {
  const [state, formAction, pending] = useActionState(action, { error: null });
  return (
    <form action={formAction} className="flex flex-col gap-3">
      <Field
        label="How many maybes will show up?"
        hint="Percent of maybes to plan for. 50 means half."
        name="percent"
        type="number"
        inputMode="numeric"
        min={0}
        max={100}
        step={1}
        defaultValue={percent}
        required
      />
      <FormError message={state.error} />
      <Button variant="outline" type="submit" disabled={pending}>
        {pending ? "Saving..." : "Save percent"}
      </Button>
    </form>
  );
}

function InviteeForm({ action }: { action: GuestsFormAction }) {
  const [state, formAction, pending] = useActionState(action, { error: null });
  return (
    <form action={formAction} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <label htmlFor="invitee-names" className="text-sm font-bold text-ink">
          Who did you invite? (optional)
        </label>
        <textarea
          id="invitee-names"
          name="names"
          rows={4}
          aria-describedby="invitee-names-hint"
          placeholder={"Alex\nSam\nJordan"}
          className="min-h-12 rounded-xl border-2 border-ink bg-white px-4 py-2 text-base text-ink placeholder:text-ink/40"
        />
        <p id="invitee-names-hint" className="text-xs text-ink/70">
          Paste names, one per line, to see who hasn&apos;t replied yet.
        </p>
      </div>
      <FormError message={state.error} />
      <Button variant="outline" type="submit" disabled={pending}>
        {pending ? "Adding..." : "Add names"}
      </Button>
    </form>
  );
}

/** "Remove" with an inline "Really remove Alex? Yes / No" step (no browser confirm). */
function RemoveGuest({ guest, action }: { guest: GuestRow; action: GuestsFormAction }) {
  const [state, formAction, pending] = useActionState(action, { error: null });
  const [confirming, setConfirming] = useState(false);
  if (!confirming) {
    return (
      <button
        type="button"
        aria-label={`Remove ${guest.name}`}
        onClick={() => setConfirming(true)}
        className="self-start text-sm font-bold text-ketchup underline"
      >
        Remove
      </button>
    );
  }
  return (
    <form action={formAction} className="flex flex-col gap-2">
      <input type="hidden" name="guestId" value={guest.id} />
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-bold">Really remove {guest.name}?</span>
        <Button
          variant="red"
          type="submit"
          disabled={pending}
          aria-label={`Yes, remove ${guest.name}`}
          className="min-h-10 px-4 py-1 text-sm"
        >
          {pending ? "Removing..." : "Yes"}
        </Button>
        <Button
          variant="outline"
          disabled={pending}
          aria-label={`No, keep ${guest.name}`}
          onClick={() => setConfirming(false)}
          className="min-h-10 px-4 py-1 text-sm"
        >
          No
        </Button>
      </div>
      <FormError message={state.error} />
    </form>
  );
}

function GuestItem({
  guest,
  duplicate,
  removeAction,
}: {
  guest: GuestRow;
  duplicate: boolean;
  removeAction: GuestsFormAction;
}) {
  return (
    <CardRow className="items-start">
      <div className="flex min-w-0 flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-bold">{guest.name}</p>
          {duplicate ? <Pill tone="cream">possible duplicate</Pill> : null}
        </div>
        {guest.plusOneNames.length > 0 ? (
          <p className="text-sm text-ink/80">+ {guest.plusOneNames.join(", ")}</p>
        ) : null}
        {guest.foodNotes ? (
          <p className="text-sm text-ink/80">Food notes: {guest.foodNotes}</p>
        ) : null}
        <RemoveGuest guest={guest} action={removeAction} />
      </div>
      <Pill tone={guest.status === "yes" ? "mustard" : "cream"}>{STATUS_LABEL[guest.status]}</Pill>
    </CardRow>
  );
}

export function GuestsPanel({
  overview,
  maybePercent,
  setMaybePercentAction,
  addInviteesAction,
  removeGuestAction,
}: {
  overview: GuestsOverview;
  maybePercent: number;
  setMaybePercentAction: GuestsFormAction;
  addInviteesAction: GuestsFormAction;
  /** Removes the guest whose id is in the form's `guestId` field. */
  removeGuestAction: GuestsFormAction;
}) {
  const { headcount, counts, guests, noReply } = overview;
  const duplicates = duplicateGuestIds(guests);
  return (
    <div className="flex flex-col gap-4">
      <Card className="flex flex-col gap-3">
        <p className="text-lg font-bold leading-snug">{breakdownLine(headcount)}</p>
        <div className="flex flex-wrap gap-2">
          <Pill>{counts.yes} yes</Pill>
          <Pill tone="cream">{counts.maybe} maybe</Pill>
          <Pill tone="cream">{counts.no} no</Pill>
          {noReply ? <Pill tone="cream">{noReply.length} no reply</Pill> : null}
        </div>
      </Card>

      <Card>
        <MaybePercentForm key={maybePercent} action={setMaybePercentAction} percent={maybePercent} />
      </Card>

      <Card>
        <h2 className="mb-3 text-lg font-bold">Guests</h2>
        {guests.length === 0 ? (
          <p className="text-sm text-ink/80">No answers yet. Share your link to get started.</p>
        ) : (
          guests.map((g) => (
            <GuestItem
              key={g.id}
              guest={g}
              duplicate={duplicates.has(g.id)}
              removeAction={removeGuestAction}
            />
          ))
        )}
      </Card>

      {noReply && noReply.length > 0 ? (
        <Card>
          <h2 className="mb-3 text-lg font-bold">No reply yet</h2>
          {noReply.map((name) => (
            <CardRow key={name}>
              <span className="font-bold">{name}</span>
            </CardRow>
          ))}
        </Card>
      ) : null}

      <Card>
        <InviteeForm action={addInviteesAction} />
      </Card>
    </div>
  );
}
