"use client";

import { useState } from "react";
import { groupByAisle } from "@/domain/aisles";
import { formatCents } from "@/domain/money";
import { biggestLine, headcountLine, shoppingListText } from "@/lib/shopping-text";
import type { ShoppingPlan } from "@/services/shopping";
import { Card } from "../ui/Card";
import { EmptyState } from "../EmptyState";
import { CopyListButton } from "./CopyListButton";
import { ExtrasCard, type ExtraWithAction } from "./ExtrasCard";
import { ShoppingLineRow, type ShoppingLineActions } from "./ShoppingLineRow";
import type { ShoppingFormAction } from "./shoppingForm";

export function ShoppingPanel({
  plan,
  rangeNote,
  lineActions,
  extras,
  addExtraAction,
}: {
  plan: ShoppingPlan;
  /** Range note for the biggest item (see biggestLine), or null. */
  rangeNote: string | null;
  /** Keyed by ingredient id; each already bound to this event and ingredient. */
  lineActions: Record<string, ShoppingLineActions>;
  extras: ExtraWithAction[];
  addExtraAction: ShoppingFormAction;
}) {
  const { headcount, lines, totalCents, totalIsProvisional } = plan;
  const [hideGot, setHideGot] = useState(false);
  const biggest = biggestLine(lines);
  const each = headcount.planFor > 0 ? Math.round(totalCents / headcount.planFor) : null;
  const bought = lines.filter((l) => l.checked).length;
  const visible = hideGot ? lines.filter((l) => !l.checked) : lines;
  const groups = groupByAisle(visible);
  const copyText = shoppingListText(
    lines.map((line) => ({
      name: line.name,
      buyQty: line.buyQty,
      buyUnit: line.buyUnit,
      checked: line.checked,
      dishNames: line.dishNames,
    })),
  );

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
      {/* On a phone the running total comes first; on desktop it sits in the margin. */}
      <aside className="order-first flex flex-col gap-4 lg:order-none lg:col-start-2 lg:row-start-1 lg:sticky lg:top-[4.25rem] lg:self-start">
        <div className="ticket receipt rounded-t-md p-5 pb-6 text-ink">
          <p className="text-sm font-semibold">
            {totalIsProvisional ? "Total (provisional)" : "Total"}
          </p>
          <p className="receipt-amount">{formatCents(totalCents)}</p>
          {each !== null ? (
            <p className="text-base font-bold">≈ {formatCents(each)} per guest (incl. extras)</p>
          ) : null}
          <p className="mt-1 text-sm font-bold text-ink/80">{headcountLine(headcount)}</p>
          {lines.length > 0 ? (
            <p className="mt-1 text-xs font-bold text-ink/70">
              {bought} of {lines.length} ingredients
            </p>
          ) : null}
          {lines.length > 0 ? (
            <div className="mt-3">
              <CopyListButton text={copyText} />
            </div>
          ) : null}
          <p className="mt-2 text-xs">Estimate where blank.</p>
          {totalIsProvisional ? (
            <p className="mt-2 text-sm font-bold">
              Provisional — recheck the items whose quantity increased since you ticked them.
            </p>
          ) : null}
        </div>
      </aside>

      <div className="flex min-w-0 flex-col gap-4 lg:col-start-1 lg:row-start-1">
        <Card>
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
            <h2 className="text-lg font-bold">Shopping list</h2>
          </div>
          {lines.length === 0 ? (
            <EmptyState inset art="shopping" title="Nothing to buy yet">
              <p>Add a dish on the Menu tab and the list shows up here.</p>
            </EmptyState>
          ) : (
            <>
              <div className="mb-4 flex flex-wrap items-start gap-x-4 gap-y-2">
                <label className="flex min-h-11 items-center gap-2 text-sm font-bold">
                  <input
                    type="checkbox"
                    checked={hideGot}
                    onChange={(e) => setHideGot(e.currentTarget.checked)}
                    className="size-5 shrink-0 accent-ketchup"
                  />
                  Hide items I&apos;ve got
                </label>
              </div>
              {groups.length === 0 ? (
                <p className="text-sm text-ink/80">
                  Every ingredient is ticked and hidden. Untick &ldquo;Hide items I&apos;ve got&rdquo;
                  to see them again.
                </p>
              ) : (
                groups.map((group) => (
                  <section key={group.aisle} className="mb-2 last:mb-0">
                    <h3 className="mb-1 border-b border-divider pb-1 text-xs font-black uppercase tracking-widest text-ink/60">
                      {group.aisle}
                    </h3>
                    {group.lines.map((line) => (
                      <ShoppingLineRow
                        key={line.itemId}
                        line={line}
                        rangeNote={line === biggest ? rangeNote : null}
                        actions={lineActions[line.itemId]}
                      />
                    ))}
                  </section>
                ))
              )}
            </>
          )}
        </Card>

        <ExtrasCard extras={extras} addAction={addExtraAction} />
      </div>
    </div>
  );
}
