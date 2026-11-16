"use client";

import { useActionState, useState } from "react";
import { formatCents } from "@/domain/money";
import type { ShoppingPlan } from "@/services/shopping";
import { EmptyState } from "../EmptyState";
import { FormError } from "../menu/menuForm";
import { Button } from "../ui/Button";
import { Card, CardRow } from "../ui/Card";
import { Field } from "../ui/Field";
import { INITIAL_SHOPPING_FORM_STATE, type ShoppingFormAction } from "./shoppingForm";

export interface ExtraWithAction {
  extra: ShoppingPlan["extras"][number];
  /** Already bound to this event and extra on the server. */
  removeAction: ShoppingFormAction;
}

function ExtraRow({ extra, removeAction }: ExtraWithAction) {
  const [state, formAction, pending] = useActionState(removeAction, INITIAL_SHOPPING_FORM_STATE);
  return (
    <CardRow className="items-start">
      <div className="flex min-w-0 flex-col">
        <span className="font-bold">{extra.label}</span>
        <FormError message={state.error} />
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <span className="font-bold">{formatCents(extra.amountCents)}</span>
        <form action={formAction}>
          <Button
            variant="outline"
            type="submit"
            disabled={pending}
            aria-label={`Remove ${extra.label}`}
            className="min-h-12 px-3 py-1"
          >
            {pending ? "..." : "Remove"}
          </Button>
        </form>
      </div>
    </CardRow>
  );
}

function AddExtraForm({ action }: { action: ShoppingFormAction }) {
  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState("");
  // Controlled, and cleared only after a successful save, so a rejected cost isn't lost.
  const [state, formAction, pending] = useActionState(
    async (prev: typeof INITIAL_SHOPPING_FORM_STATE, formData: FormData) => {
      const next = await action(prev, formData);
      if (!next.error) {
        setLabel("");
        setAmount("");
      }
      return next;
    },
    INITIAL_SHOPPING_FORM_STATE,
  );
  return (
    <form action={formAction} className="flex flex-col gap-3">
      <Field
        label="What else did you buy?"
        name="label"
        placeholder="Ice, charcoal, drinks"
        maxLength={80}
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        required
      />
      <Field
        label="Amount ($)"
        name="amount"
        type="text"
        inputMode="decimal"
        autoComplete="off"
        placeholder="8.00"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        required
      />
      <FormError message={state.error} />
      <Button variant="mustard" type="submit" disabled={pending}>
        {pending ? "Adding..." : "Add cost"}
      </Button>
    </form>
  );
}

/** Costs that aren't on the ingredient list, with an add form. */
export function ExtrasCard({
  extras,
  addAction,
}: {
  extras: ExtraWithAction[];
  addAction: ShoppingFormAction;
}) {
  return (
    <Card className="flex flex-col gap-4">
      <h2 className="text-lg font-bold">Extras</h2>
      {extras.length === 0 ? (
        <EmptyState inset size="sm" art="cart" title="Nothing extra yet">
          <p>Drinks, ice and charcoal go here.</p>
        </EmptyState>
      ) : (
        <div>
          {extras.map(({ extra, removeAction }) => (
            <ExtraRow key={extra.id} extra={extra} removeAction={removeAction} />
          ))}
        </div>
      )}
      <AddExtraForm action={addAction} />
    </Card>
  );
}
