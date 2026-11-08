import { formatCents } from "@/domain/money";
import type { SplitView } from "@/services/split";
import { Card } from "../ui/Card";
import { SplitGuestRow, type SplitRowActions } from "./SplitGuestRow";
import { SplitSettings } from "./SplitSettings";
import type { SplitFormAction } from "./splitForm";

/** Heads that actually share the bill: came and not excluded. */
function payingHeads(rows: SplitView["rows"]): number {
  return rows.filter((r) => r.attended && !r.excluded).reduce((sum, r) => sum + r.heads, 0);
}

export function SplitPanel({
  view,
  hostCoverCents,
  rowActions,
  coverAction,
  venmoAction,
}: {
  view: SplitView;
  /** What the host entered for cover, which can exceed the total (view.hostCoveredCents is clamped). */
  hostCoverCents: number;
  /** Keyed by guest id; each already bound to this event and guest. */
  rowActions: Record<string, SplitRowActions>;
  coverAction: SplitFormAction;
  venmoAction: SplitFormAction;
}) {
  const { rows, totalCents, hostCoveredCents, unassignedCents } = view;
  const heads = payingHeads(rows);
  const charged = totalCents - hostCoveredCents;
  const each = heads > 0 ? Math.round(charged / heads) : null;
  const nobodyCame = !rows.some((r) => r.attended);
  const paidCount = rows.filter((r) => r.attended && !r.excluded && r.owedCents > 0 && r.paid).length;
  const owingCount = rows.filter((r) => r.attended && !r.excluded && r.owedCents > 0).length;

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-[14px] border-2 border-ink bg-ketchup p-4 text-cream">
        <p className="text-sm font-bold uppercase tracking-wide">Total</p>
        <p className="font-display text-4xl font-bold">{formatCents(totalCents)}</p>
        {each !== null ? (
          <p className="text-base font-bold">
            {formatCents(totalCents)} total · about {formatCents(each)} each
          </p>
        ) : null}
        {hostCoveredCents > 0 ? (
          <p className="text-sm">You cover {formatCents(hostCoveredCents)}</p>
        ) : null}
        {nobodyCame ? (
          <p className="mt-1 text-sm font-bold">Tick who came to see what everyone owes</p>
        ) : unassignedCents > 0 ? (
          <p className="mt-1 text-sm font-bold">
            {formatCents(unassignedCents)} isn&apos;t assigned to anyone yet
          </p>
        ) : null}
      </div>

      <Card>
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <h2 className="text-lg font-bold">Tick who came</h2>
          {owingCount > 0 ? (
            <span className="text-xs font-bold text-ink/70">
              {paidCount} of {owingCount} paid
            </span>
          ) : null}
        </div>
        {rows.length === 0 ? (
          <p className="text-sm text-ink/80">
            No guests yet. Share your link and the people who say yes show up here.
          </p>
        ) : (
          rows.map((row) => (
            <SplitGuestRow key={row.guestId} row={row} actions={rowActions[row.guestId]} />
          ))
        )}
      </Card>

      <SplitSettings
        hostCoverCents={hostCoverCents}
        venmoUsername={view.venmoUsername}
        coverAction={coverAction}
        venmoAction={venmoAction}
      />
    </div>
  );
}
