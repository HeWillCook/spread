"use client";

import { useActionState, useState } from "react";
import { formatCents } from "@/domain/money";
import { formatBuyQty } from "@/lib/shopping-text";
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

function CheckBox({ name, checked, action }: { name: string; checked: boolean; action: ShoppingFormAction }) {
  const [, formAction] = useActionState(action, INITIAL_SHOPPING_FORM_STATE);
  return (
    <form action={formAction} className="flex">
      <input
        type="checkbox"
        name="checked"
        defaultChecked={checked}
        aria-label={`Got ${name}`}
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
        className="size-7 shrink-0 accent-ketchup"
      />
    </form>
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
          className="min-h-12 w-24 rounded-xl border-2 border-ink bg-white px-3 py-2 text-right text-base text-ink placeholder:text-ink/40"
        />
      </label>
      <FormError message={state.error} />
    </form>
  );
}

/** One ingredient: tick box, emoji, name, how much to buy, and an editable price. */
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
      <div className="pt-2">
        {/* Re-keyed when the saved tick changes, so the box always shows the server's state. */}
        <CheckBox
          key={`${line.itemId}:${line.checked}`}
          name={line.name}
          checked={line.checked}
          action={actions.checkAction}
        />
      </div>
      <span aria-hidden="true" className="pt-1 text-3xl leading-none">
        {line.emoji}
      </span>
      <div className="min-w-0 flex-1">
        <p className={`font-bold leading-tight ${line.checked ? "line-through opacity-60" : ""}`}>
          {line.name}
        </p>
        <p className="text-sm font-bold text-ink/80">{formatBuyQty(line.buyQty, line.buyUnit)}</p>
        <p className="text-xs text-ink/70">
          {line.actualCents === null
            ? `est. ${formatCents(line.estCostCents)}`
            : `paid ${formatCents(line.actualCents)} (est. ${formatCents(line.estCostCents)})`}
        </p>
        {rangeNote ? (
          <p className="mt-1 inline-block rounded-full border-2 border-ink bg-cream px-2 py-0.5 text-xs font-bold">
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
