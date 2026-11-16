"use client";

import { useActionState, useOptimistic, useState, useTransition } from "react";
import { formatCents } from "@/domain/money";
import { formatBuyLabel, formatBuyQty, formatNeed } from "@/lib/shopping-text";
import type { ShoppingPlan } from "@/services/shopping";
import { FormError } from "../menu/menuForm";
import {
  centsToInput,
  INITIAL_SHOPPING_FORM_STATE,
  type ShoppingFormAction,
} from "./shoppingForm";

export interface ShoppingLineActions {
  /** Already bound to this event and ingredient on the server. */
  checkAction: ShoppingFormAction;
  priceAction: ShoppingFormAction;
}

/**
 * The tick box. Optimistic: the box flips on tap, and if the save fails the
 * transition ends without new props so the box flips back — with the reason
 * shown underneath instead of a silently-checked row.
 */
function CheckBox({ line, action }: { line: ShoppingPlan["lines"][number]; action: ShoppingFormAction }) {
  const [checked, setOptimisticChecked] = useOptimistic(line.checked);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function toggle(next: boolean) {
    startTransition(async () => {
      setOptimisticChecked(next);
      setError(null);
      // An unticked checkbox sends nothing, matching the form's encoding.
      const data = new FormData();
      if (next) data.append("checked", "on");
      try {
        const result = await action(INITIAL_SHOPPING_FORM_STATE, data);
        if (result.error) setError(result.error);
      } catch {
        // A thrown action (network, server crash) rolls back the same way.
        setError("Couldn't save that tick. Try again.");
      }
    });
  }

  return (
    <div className="flex w-16 flex-col gap-1">
      <label className="flex size-11 cursor-pointer items-center justify-center">
        <input
          type="checkbox"
          checked={checked}
          disabled={pending}
          aria-label={`Got ${line.name}`}
          onChange={(e) => toggle(e.currentTarget.checked)}
          className="size-7 shrink-0 accent-ketchup"
        />
      </label>
      <FormError message={error} />
    </div>
  );
}

function PriceBox({
  name,
  actualCents,
  estCents,
  action,
}: {
  name: string;
  actualCents: number | null;
  estCents: number;
  action: ShoppingFormAction;
}) {
  const saved = centsToInput(actualCents);
  const [state, formAction, pending] = useActionState(action, INITIAL_SHOPPING_FORM_STATE);
  // Controlled so a rejected price stays on screen next to its error.
  const [text, setText] = useState(saved);
  return (
    <form action={formAction} className="flex flex-col items-end gap-1">
      <label className="flex items-center gap-1 text-sm font-bold">
        <span aria-hidden="true">$</span>
        <input
          name="price"
          type="text"
          inputMode="decimal"
          autoComplete="off"
          aria-label={`Actual price for ${name}`}
          placeholder={centsToInput(estCents)}
          value={text}
          disabled={pending}
          onChange={(e) => setText(e.target.value)}
          onBlur={(e) => {
            if (text.trim() !== saved) e.currentTarget.form?.requestSubmit();
          }}
          className="min-h-12 w-24 rounded-xl border border-ink/55 bg-white px-3 py-2 text-right text-base text-ink placeholder:text-ink-muted"
        />
      </label>
      <FormError message={state.error} />
    </form>
  );
}

/** One ingredient: tick box, emoji, name, how much to buy vs. need, and an editable price. */
export function ShoppingLineRow({
  line,
  rangeNote,
  actions,
}: {
  line: ShoppingPlan["lines"][number];
  /** e.g. "range 6–9 lb", for the biggest item. */
  rangeNote: string | null;
  actions: ShoppingLineActions;
}) {
  return (
    <div className="flex items-start gap-3 border-t-2 border-dashed border-divider py-3 first:border-t-0 first:pt-0 last:pb-0">
      <div className="-ml-2">
        <CheckBox line={line} action={actions.checkAction} />
      </div>
      <span aria-hidden="true" className="hidden pt-1 text-3xl leading-none sm:block">
        {line.emoji}
      </span>
      <div className="min-w-0 flex-1">
        <p className={`font-bold leading-tight ${line.checked ? "line-through opacity-60" : ""}`}>
          {line.name}
        </p>
        <p className="text-sm font-bold text-ink/80">
          Buy {formatBuyLabel(line.buyQty, line.buyUnit)}
        </p>
        <p className="text-xs text-ink/70">
          need {formatNeed(line.needed, line.neededUnit, line.buyUnit, line.unitsPerBuy)}
        </p>
        {line.needsReview ? (
          <p className="mt-1 text-xs font-bold text-ketchup">
            {line.checkedQty === null
              ? "Recheck this item: it was ticked before we tracked quantities. Tick again to confirm."
              : `Quantity increased: now ${formatBuyQty(line.buyQty, line.buyUnit)} (was ${formatBuyQty(line.checkedQty, line.buyUnit)}). Tick again to confirm.`}
          </p>
        ) : null}
        {line.dishNames.length > 1 ? (
          <p className="text-xs text-ink-muted">for {line.dishNames.join(", ")}</p>
        ) : null}
        <p className="text-xs text-ink/70">
          {line.actualCents === null
            ? `est. ${formatCents(line.estCostCents)}`
            : `paid ${formatCents(line.actualCents)} (est. ${formatCents(line.estCostCents)})`}
        </p>
        {rangeNote ? (
          <p className="mt-1 inline-block rounded-full border border-divider bg-cream px-2 py-0.5 text-xs font-bold">
            {rangeNote}
          </p>
        ) : null}
      </div>
      <PriceBox
        key={`${line.itemId}:${line.actualCents ?? "none"}`}
        name={line.name}
        actualCents={line.actualCents}
        estCents={line.estCostCents}
        action={actions.priceAction}
      />
    </div>
  );
}
