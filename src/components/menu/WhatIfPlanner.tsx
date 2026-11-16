"use client";

import { useId, useState } from "react";
import type { Headcount } from "@/domain/headcount";
import { formatCents } from "@/domain/money";
import {
  attendancePresets,
  buildAttendancePreview,
  customHeadcountLimit,
  parseCustomHeadcount,
  type AttendancePresetId,
  type AttendancePreview,
} from "@/lib/attendance-preview";
import { servingWord } from "@/lib/menu-text";
import { formatBuyQty } from "@/lib/shopping-text";
import type { MenuDish } from "@/services/menu";

function people(count: number): string {
  return count === 1 ? "1 person" : `${count} people`;
}

function signedCents(cents: number): string {
  if (cents === 0) return "no change";
  return `${cents > 0 ? "+" : "-"}${formatCents(Math.abs(cents))}`;
}

function qtyChange(delta: number, unit: string): string {
  if (delta === 0) return "no change";
  return `${formatBuyQty(Math.abs(delta), unit)} ${delta > 0 ? "more" : "fewer"}`;
}

/** A plain-language comparison for the visible, polite live region. */
function announcement(preview: AttendancePreview, hasLines: boolean): string {
  const difference = preview.heads - preview.baselineHeads;
  const comparison =
    difference === 0
      ? `Previewing ${people(preview.heads)}, the same as your saved plan.`
      : `Previewing ${people(preview.heads)}, ${Math.abs(difference)} ${
          difference > 0 ? "more" : "fewer"
        } than your saved plan of ${people(preview.baselineHeads)}.`;
  if (!hasLines) return comparison;
  if (preview.costDeltaCents === 0) {
    return `${comparison} Ingredient estimates are unchanged.`;
  }
  return `${comparison} Ingredient estimates are ${formatCents(
    Math.abs(preview.costDeltaCents),
  )} ${preview.costDeltaCents > 0 ? "higher" : "lower"}.`;
}

/**
 * A local attendance sandbox. It only reads saved menu and headcount props:
 * no server actions, no RSVP/menu/shopping writes and no billing data.
 */
export function WhatIfPlanner({
  dishes,
  headcount,
  unansweredCount,
}: {
  dishes: MenuDish[];
  headcount: Headcount;
  unansweredCount?: number;
}) {
  const id = useId();
  const titleId = `${id}-title`;
  const presetLabelId = `${id}-presets`;
  const customId = `${id}-custom`;
  const customHintId = `${id}-custom-hint`;
  const customErrorId = `${id}-custom-error`;
  const yieldsId = `${id}-yields`;
  const costsId = `${id}-costs`;
  const tableId = `${id}-table`;

  const presets = attendancePresets(headcount);
  const limit = customHeadcountLimit(headcount);
  const [presetId, setPresetId] = useState<AttendancePresetId>("plan");
  const [customMode, setCustomMode] = useState(false);
  const [customRaw, setCustomRaw] = useState("");
  const [customHeads, setCustomHeads] = useState<number | null>(null);
  const [customError, setCustomError] = useState<string | null>(null);

  const activePreset = presets.find((preset) => preset.id === presetId) ?? presets[1];
  const customCapped = customMode && customHeads !== null && customHeads > limit;
  const heads =
    customMode && customHeads !== null
      ? Math.min(customHeads, limit)
      : activePreset.heads;
  const preview = buildAttendancePreview(dishes, headcount, heads);
  const hasDishes = dishes.length > 0;
  const allPresetsEqual = presets.every((preset) => preset.heads === presets[0].heads);
  const noGuestsYet = headcount.confirmed === 0 && headcount.maybeHeads === 0;

  function choosePreset(next: AttendancePresetId) {
    setPresetId(next);
    setCustomMode(false);
    setCustomRaw("");
    setCustomHeads(null);
    setCustomError(null);
  }

  function changeCustom(raw: string) {
    setCustomRaw(raw);
    const result = parseCustomHeadcount(raw, headcount);
    if (result.error !== null) {
      // Keep the last valid preview while the host is mid-edit.
      setCustomError(result.error);
      return;
    }
    setCustomError(null);
    setCustomHeads(result.heads);
    setCustomMode(true);
  }

  return (
    <section
      aria-labelledby={titleId}
      className="whatif-planner"
    >
      <header className="whatif-header flex flex-col gap-2">
        <h2 id={titleId} className="whatif-title text-2xl font-bold">
          Room for a few more?
        </h2>
        <p className="whatif-lede max-w-prose text-sm leading-relaxed text-ink/80">
          Saved plan: {people(preview.baselineHeads)}. Try a different turnout to see what changes.
        </p>
      </header>

      <div className="whatif-controls">
      <div className="whatif-presets flex flex-col gap-2">
        <p id={presetLabelId} className="whatif-label text-sm font-bold">
          Compare headcounts
        </p>
        <div
          role="group"
          aria-labelledby={presetLabelId}
          className="whatif-preset-grid"
        >
          {presets.map((preset) => {
            const pressed = !customMode && preset.id === presetId;
            return (
              <button
                key={preset.id}
                type="button"
                aria-pressed={pressed}
                aria-label={`${preset.label}: ${people(preset.heads)}. ${preset.hint}`}
                onClick={() => choosePreset(preset.id)}
                className={`whatif-preset ${pressed ? "whatif-preset-active" : ""}`}
              >
                <span className="whatif-preset-label text-sm font-bold">{preset.label}</span>
                <span className="whatif-preset-heads font-display text-3xl font-bold leading-none tabular-nums">
                  {preset.heads}
                </span>
                <span className="whatif-preset-hint text-xs leading-snug text-ink-muted">
                  {preset.hint}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="whatif-custom flex flex-col gap-2">
        <label htmlFor={customId} className="whatif-custom-label text-sm font-bold">
          Try a headcount
        </label>
        <div className="whatif-custom-row flex items-center gap-2">
          <input
            id={customId}
            type="number"
            inputMode="numeric"
            min={0}
            max={limit}
            step={1}
            value={customRaw}
            onChange={(event) => changeCustom(event.target.value)}
            aria-invalid={customError !== null}
            aria-describedby={
              customError !== null ? `${customHintId} ${customErrorId}` : customHintId
            }
            className="whatif-custom-input min-h-11 w-28 rounded-xl border border-ink/55 bg-white px-3.5 py-2.5 text-base text-ink tabular-nums"
          />
          <span className="whatif-custom-unit text-sm text-ink-muted">people</span>
        </div>
        <p id={customHintId} className="whatif-custom-hint text-xs leading-relaxed text-ink-muted">
          Whole numbers from 0 to {limit}.
        </p>
        {customError !== null ? (
          <p id={customErrorId} role="alert" className="whatif-custom-error text-sm font-bold text-ketchup">
            {customError} The preview still shows {people(heads)}.
          </p>
        ) : null}
        {customCapped ? (
          <p className="whatif-custom-note text-xs leading-relaxed text-ink-muted">
            Saved guest counts changed, so the preview stops at {people(limit)}.
          </p>
        ) : null}
      </div>

      </div>

      {/* The one visible change announcement for preset and custom choices. */}
      <p
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="whatif-status"
      >
        {announcement(preview, hasDishes)}
      </p>

      {hasDishes ? (
        <div className="whatif-spread">
          <div className="whatif-side flex flex-col gap-5">
            <section aria-labelledby={yieldsId} className="whatif-yields flex flex-col gap-2">
              <h3 id={yieldsId} className="whatif-subhead text-lg font-bold">
                What the menu makes
              </h3>
              <dl className="whatif-yield-list flex flex-col gap-2 text-sm">
                {preview.dishes.map((dish) => {
                  const same = dish.servings === dish.baselineServings;
                  return (
                    <div key={dish.recipeId} className="whatif-yield flex items-baseline justify-between gap-3">
                      <dt className="min-w-0">
                        <span aria-hidden="true">{dish.emoji}</span> {dish.name}
                      </dt>
                      <dd className="text-right">
                        <span className="whatif-yield-value font-bold tabular-nums">
                          {formatBuyQty(dish.servings, servingWord(dish.name))}
                        </span>
                        <span className="whatif-yield-baseline block text-xs text-ink-muted">
                          {same
                            ? "same as saved plan"
                            : `was ${formatBuyQty(
                                dish.baselineServings,
                                servingWord(dish.name),
                              )}`}
                        </span>
                      </dd>
                    </div>
                  );
                })}
              </dl>
            </section>

            <section aria-labelledby={costsId} className="whatif-costs flex flex-col gap-2">
              <h3 id={costsId} className="whatif-subhead text-lg font-bold">
                Estimated ingredients
              </h3>
              <dl className="whatif-cost-list flex flex-col gap-1 text-sm">
                <div className="whatif-cost flex items-baseline justify-between gap-3">
                  <dt>Saved plan</dt>
                  <dd className="font-bold tabular-nums">
                    {formatCents(preview.baselineEstCostCents)}
                  </dd>
                </div>
                <div className="whatif-cost flex items-baseline justify-between gap-3">
                  <dt>This preview</dt>
                  <dd className="font-bold tabular-nums">{formatCents(preview.estCostCents)}</dd>
                </div>
                <div data-changed={preview.costDeltaCents !== 0} className="whatif-cost whatif-cost-difference flex items-baseline justify-between gap-3 border-t border-dashed border-divider pt-1">
                  <dt>Difference</dt>
                  <dd className="font-bold tabular-nums">
                    {signedCents(preview.costDeltaCents)}
                  </dd>
                </div>
              </dl>
              <p className="whatif-note whatif-note-cost text-xs leading-relaxed text-ink-muted">
                Ingredient estimates use your saved price per buy unit. They don&apos;t include actual
                spend or extras, and quantities round up to whole buy units.
              </p>
            </section>
          </div>

          <section aria-labelledby={tableId} className="whatif-detail flex min-w-0 flex-col gap-2">
            <h3 id={tableId} className="whatif-subhead text-lg font-bold">
              Ingredient comparison
            </h3>
            <div className="whatif-table-wrap w-full overflow-x-auto">
              <table className="whatif-table">
                <caption className="whatif-caption mb-2 text-left text-xs text-ink-muted">
                  Saved plan versus this preview
                </caption>
                <thead>
                  <tr className="border-b border-divider-strong text-left">
                    <th scope="col" className="whatif-col-ingredient py-2 pr-3 font-bold">
                      Ingredient
                    </th>
                    <th scope="col" className="whatif-col-baseline py-2 pr-3 font-bold">
                      Saved plan
                    </th>
                    <th scope="col" className="whatif-col-preview py-2 pr-3 font-bold">
                      This preview
                    </th>
                    <th scope="col" className="whatif-col-change py-2 font-bold">
                      Difference
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {preview.lines.map((line) => {
                    const changed = line.buyQtyDelta !== 0 || line.costDeltaCents !== 0;
                    return (
                      <tr
                        key={`${line.recipeId}:${line.itemId}`}
                        className={`whatif-row border-b border-dashed border-divider align-top ${
                          changed ? "whatif-row-changed" : ""
                        }`}
                      >
                        <th scope="row" className="py-2 pr-3 text-left font-normal">
                          <span aria-hidden="true">{line.emoji}</span> {line.name}
                          {line.dishNames.length > 1 ? (
                            <span className="whatif-line-dishes block text-xs text-ink-muted">
                              for {line.dishNames.join(", ")}
                            </span>
                          ) : null}
                        </th>
                        <td className="py-2 pr-3">
                          <span className="whatif-qty block tabular-nums">
                            {formatBuyQty(line.baselineBuyQty, line.buyUnit)}
                          </span>
                          <span className="whatif-line-cost block text-xs text-ink-muted tabular-nums">
                            {formatCents(line.baselineCostCents)}
                          </span>
                        </td>
                        <td className="py-2 pr-3">
                          <span className="whatif-qty block font-bold tabular-nums">
                            {formatBuyQty(line.buyQty, line.buyUnit)}
                          </span>
                          <span className="whatif-line-cost block text-xs text-ink-muted tabular-nums">
                            {formatCents(line.estCostCents)}
                          </span>
                        </td>
                        <td className="py-2">
                          {changed ? (
                            <span className="whatif-change flex flex-col gap-0.5">
                              <span className="whatif-qty-change font-bold tabular-nums">
                                {qtyChange(line.buyQtyDelta, line.buyUnit)}
                              </span>
                              <span className="whatif-cost-change text-xs text-ink-muted tabular-nums">
                                {signedCents(line.costDeltaCents)}
                              </span>
                            </span>
                          ) : (
                            <span className="whatif-change whatif-change-same">no change</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="whatif-table-note text-xs leading-relaxed text-ink-muted">
              Shopping rounds up to whole buy units, so a small headcount change may not
              change a line.
            </p>
          </section>
        </div>
      ) : (
        <p className="whatif-empty rounded-xl border border-dashed border-divider p-4 text-sm leading-relaxed text-ink/80">
          No dishes on the menu yet. Add a dish to compare ingredient quantities and
          estimated costs.
        </p>
      )}

      <div className="whatif-notes flex flex-col gap-2 text-xs leading-relaxed text-ink/80">
        {noGuestsYet ? (
          <p className="whatif-note whatif-note-zero">
            No confirmed or maybe guests yet, so every option is {people(0)}.
          </p>
        ) : null}
        {allPresetsEqual && !noGuestsYet ? (
          <p className="whatif-note whatif-note-equal">
            Confirmed, your saved plan and all maybes all come to {people(presets[0].heads)} right
            now.
          </p>
        ) : null}
        <p className="whatif-note">
          Plus-ones are included in these counts. Guests who said no aren&apos;t counted.
        </p>
        {unansweredCount !== undefined && unansweredCount > 0 ? (
          <p className="whatif-note whatif-note-unknown">
            {unansweredCount} {unansweredCount === 1 ? "invitation has" : "invitations have"} no
            reply yet. They aren&apos;t counted in any headcount here.
          </p>
        ) : null}
        <p className="whatif-note whatif-note-readonly">
          This is a sandbox. It doesn&apos;t change RSVPs, the menu, the shopping list or payments.
        </p>
      </div>
    </section>
  );
}
