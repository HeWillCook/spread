"use client";

import { startTransition, useActionState, useState } from "react";
import { formatCents } from "@/domain/money";
import { buildVenmoMessage, firstName } from "@/lib/venmo-message";
import type { SplitRow } from "@/services/split";
import { FormError } from "../menu/menuForm";
import { Pill } from "../ui/Pill";
import { INITIAL_SPLIT_FORM_STATE, type SplitFormAction } from "./splitForm";

export interface SplitRowActions {
  /** Already bound to this event and guest on the server. */
  attendedAction: SplitFormAction;
  excludedAction: SplitFormAction;
  paidAction: SplitFormAction;
  linkSentAction: SplitFormAction;
}

/** A checkbox that saves as soon as it is toggled. */
function AutoCheckbox({
  field,
  label,
  checked,
  action,
  size = "size-7",
}: {
  field: string;
  label: string;
  checked: boolean;
  action: SplitFormAction;
  size?: string;
}) {
  const [state, formAction] = useActionState(action, INITIAL_SPLIT_FORM_STATE);
  return (
    <form action={formAction} className="flex flex-col gap-1">
      <input
        type="checkbox"
        name={field}
        defaultChecked={checked}
        aria-label={label}
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
        className={`${size} shrink-0 accent-ketchup`}
      />
      <FormError message={state.error} />
    </form>
  );
}

const VENMO_ORIGIN = "https://venmo.com/";

/**
 * Hands the guest's prefilled Venmo link to the host's share sheet (or the clipboard),
 * and records "link sent" only once that actually succeeded. Opening the link on the
 * host's own phone would just be a pay-yourself screen, so that is a separate, secondary
 * "Open link" that never marks anything as sent.
 */
function SendLink({
  name,
  eventTitle,
  owedCents,
  url,
  action,
}: {
  name: string;
  eventTitle: string;
  owedCents: number;
  url: string;
  action: SplitFormAction;
}) {
  const [state, formAction] = useActionState(action, INITIAL_SPLIT_FORM_STATE);
  const [copied, setCopied] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  async function send() {
    const text = buildVenmoMessage({ name, eventTitle, owedCents, url });
    setCopied(false);
    setProblem(null);
    let delivered = false;
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ text });
        delivered = true;
      } catch (error) {
        // Closing the share sheet is not a failure and must not mark the link as sent.
        if (error instanceof Error && error.name === "AbortError") return;
      }
    }
    if (!delivered && typeof navigator.clipboard?.writeText === "function") {
      try {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        delivered = true;
      } catch {
        // Falls through to the message below.
      }
    }
    if (!delivered) {
      setProblem("Couldn't share or copy the link. Try Open link, then copy it from there.");
      return;
    }
    startTransition(() => formAction(new FormData()));
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          aria-label={`Send Venmo link to ${name}`}
          onClick={send}
          className="inline-flex min-h-12 items-center justify-center rounded-xl border-2 border-ink bg-mustard px-4 py-2 text-base font-bold text-ink active:translate-y-px"
        >
          Send Venmo link
        </button>
        {url.startsWith(VENMO_ORIGIN) ? (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Open link for ${name} (test only, not marked as sent)`}
            className="text-sm font-bold text-ketchup underline"
          >
            Open link
          </a>
        ) : null}
      </div>
      {copied ? (
        <p role="status" className="text-sm font-bold">
          Copied! Paste it into a text to {firstName(name)}.
        </p>
      ) : null}
      {problem ? (
        <p role="alert" className="text-sm font-bold text-ketchup">
          {problem}
        </p>
      ) : null}
      <FormError message={state.error} />
    </div>
  );
}

/** One guest: came?, name and plus-ones, exclude toggle, and (once ticked) what they owe. */
export function SplitGuestRow({
  row,
  eventTitle,
  actions,
}: {
  row: SplitRow;
  eventTitle: string;
  actions: SplitRowActions;
}) {
  const plusOnes = row.heads - 1;
  const owes = row.attended && !row.excluded;
  return (
    <div className="flex items-start gap-3 border-t-2 border-dashed border-divider py-3 first:border-t-0 first:pt-0 last:pb-0">
      <div className="pt-0.5">
        {/* Re-keyed when the saved value changes, so the box always shows the server's state. */}
        <AutoCheckbox
          key={`${row.guestId}:attended:${row.attended}`}
          field="attended"
          label={`${row.name} came`}
          checked={row.attended}
          action={actions.attendedAction}
        />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <span className="font-bold leading-tight">{row.name}</span>
            {plusOnes > 0 ? <Pill tone="cream">+{plusOnes}</Pill> : null}
            {row.linkSentAt ? <Pill>link sent</Pill> : null}
          </div>
          {row.attended ? (
            <span className="shrink-0 font-bold">{owes ? formatCents(row.owedCents) : "$0.00"}</span>
          ) : null}
        </div>

        {row.attended ? (
          <>
            <div className="flex items-center gap-2 text-sm">
              <AutoCheckbox
                key={`${row.guestId}:excluded:${row.excluded}`}
                field="excluded"
                label={`Exclude ${row.name}`}
                checked={row.excluded}
                action={actions.excludedAction}
                size="size-5"
              />
              <span aria-hidden="true">exclude (e.g. kids)</span>
            </div>
            {owes && row.owedCents > 0 ? (
              <div className="flex flex-wrap items-center gap-3">
                {row.venmoUrl ? (
                  <SendLink
                    name={row.name}
                    eventTitle={eventTitle}
                    owedCents={row.owedCents}
                    url={row.venmoUrl}
                    action={actions.linkSentAction}
                  />
                ) : null}
                <div className="flex items-center gap-2 text-sm font-bold">
                  <AutoCheckbox
                    key={`${row.guestId}:paid:${row.paid}`}
                    field="paid"
                    label={`${row.name} paid`}
                    checked={row.paid}
                    action={actions.paidAction}
                  />
                  <span aria-hidden="true">Paid</span>
                </div>
              </div>
            ) : null}
          </>
        ) : null}
      </div>
    </div>
  );
}
