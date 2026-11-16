"use client";

import { useActionState, useState } from "react";
import { duplicateGuestIds } from "@/lib/guest-names";
import type { GuestsOverview, GuestRow } from "@/services/guestsOverview";
import { CopyReminderButton } from "./CopyReminderButton";
import { EmptyState } from "./EmptyState";
import { FoodNotesSummary } from "./FoodNotesSummary";
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

const STATUS_TONE = { yes: "pickle", maybe: "mustard", no: "quiet" } as const;

function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p
      role="alert"
      className="rounded-xl bg-ketchup px-4 py-3 text-sm font-bold text-paper"
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
          className="min-h-12 rounded-xl border border-divider bg-white px-4 py-3 text-base text-ink placeholder:text-ink/65"
        />
        <p id="invitee-names-hint" className="text-xs text-ink-muted">
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
        className="min-h-9 text-sm font-medium text-ink-muted underline decoration-ink/30 underline-offset-4 hover:text-ketchup hover:decoration-ketchup"
      >
        Remove
      </button>
    );
  }
  return (
    <form action={formAction} className="flex flex-col items-end gap-2 pt-1">
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
    <CardRow className="items-start py-2.5">
      <div className="flex min-w-0 flex-col gap-0.5">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-semibold">{guest.name}</p>
          {duplicate ? <Pill tone="quiet">possible duplicate</Pill> : null}
        </div>
        {guest.plusOneNames.length > 0 ? (
          <p className="text-sm text-ink-muted">+ {guest.plusOneNames.join(", ")}</p>
        ) : null}
        {guest.foodNotes ? (
          <p className="text-sm text-ink-muted">Food notes: {guest.foodNotes}</p>
        ) : null}
      </div>
      <div className="flex shrink-0 flex-col items-end gap-0.5">
        <Pill tone={STATUS_TONE[guest.status]}>{STATUS_LABEL[guest.status]}</Pill>
        <RemoveGuest guest={guest} action={removeAction} />
      </div>
    </CardRow>
  );
}

export function GuestsPanel({
  overview,
  maybePercent,
  setMaybePercentAction,
  addInviteesAction,
  removeGuestAction,
  invitation,
}: {
  overview: GuestsOverview;
  maybePercent: number;
  setMaybePercentAction: GuestsFormAction;
  addInviteesAction: GuestsFormAction;
  /** Removes the guest whose id is in the form's `guestId` field. */
  removeGuestAction: GuestsFormAction;
  invitation?: { title: string; url: string };
}) {
  const { headcount, counts, guests, noReply } = overview;
  const duplicates = duplicateGuestIds(guests);
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <h2 className="text-[1.75rem] leading-tight">Make room at the table.</h2>
        <p className="max-w-[62ch] text-[1.0625rem] font-semibold leading-snug">{breakdownLine(headcount)}</p>
        <div className="flex flex-wrap gap-2">
          <Pill tone="pickle">{counts.yes} yes</Pill>
          <Pill tone="mustard">{counts.maybe} maybe</Pill>
          <Pill tone="quiet">{counts.no} no</Pill>
          {noReply ? <Pill tone="quiet">{noReply.length} no reply</Pill> : null}
        </div>
        <p className="max-w-[62ch] text-sm leading-relaxed text-ink-muted">Includes named plus-ones. People who haven&apos;t replied aren&apos;t included in the food plan. As answers come in, quantities update on the Menu and Shopping tabs.</p>
      </div>

      <FoodNotesSummary guests={guests} />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="flex min-w-0 flex-col gap-6">
      {guests.length === 0 ? (
        <EmptyState art="guests" title="No answers yet" className="lg:flex-1">
          <p>
            Share your link above to get started, then add your dishes on the
            Menu tab.
          </p>
        </EmptyState>
      ) : (
        <Card>
          <h2 className="mb-3 text-xl">Guests</h2>
          {guests.map((g) => (
            <GuestItem
              key={g.id}
              guest={g}
              duplicate={duplicates.has(g.id)}
              removeAction={removeGuestAction}
            />
          ))}
        </Card>
      )}

      {noReply && noReply.length > 0 ? (
        <Card>
          <h2 className="mb-3 text-xl">No reply yet</h2>
          <p className="mb-4 text-sm leading-relaxed text-ink-muted">A quick nudge helps you shop with a clearer headcount. Copy a personal reminder and send it in your usual chat.</p>
          {noReply.map((name) => (
            <CardRow key={name} className="flex-col items-stretch">
              <span className="break-words font-bold">{name}</span>
              {invitation ? <CopyReminderButton name={name} title={invitation.title} url={invitation.url} /> : null}
            </CardRow>
          ))}
          <p className="mt-4 text-xs leading-relaxed text-ink-muted">Names are matched by spelling. Someone who replied under a different name may still appear here.</p>
        </Card>
      ) : null}
      </div>

      <aside className="flex min-w-0 flex-col gap-6 lg:sticky lg:top-[4.25rem] lg:self-start">
      <Card>
        <h2 className="mb-2 text-xl">Plan for the maybes</h2>
        <p className="mb-4 text-sm leading-relaxed text-ink-muted">You know your crowd. Choose how many tentative guests to include when calculating food.</p>
        <MaybePercentForm key={maybePercent} action={setMaybePercentAction} percent={maybePercent} />
      </Card>
      <Card>
        <h2 className="mb-2 text-xl">Keep track of invitations</h2>
        <p className="mb-4 text-sm leading-relaxed text-ink-muted">Add your invite list to see who still needs a reminder.</p>
        <InviteeForm action={addInviteesAction} />
      </Card>
      </aside>
      </div>
    </div>
  );
}
