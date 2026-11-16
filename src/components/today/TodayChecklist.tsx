"use client";

import { useMemo, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import type { TodayChecklistItem, TodayPlan } from "@/lib/today-plan";

// Day-of ticks are a local convenience, not event data: no schema, no server round trip.
const STORAGE_PREFIX = "spread:today:";

type Ticks = Record<string, boolean>;
const NO_TICKS: Ticks = {};

function parseTicks(raw: string | null): Ticks {
  if (!raw) return NO_TICKS;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return NO_TICKS;
    const ticks: Ticks = {};
    for (const [id, value] of Object.entries(parsed)) {
      if (value === true) ticks[id] = true;
    }
    return ticks;
  } catch {
    return NO_TICKS;
  }
}

/**
 * One checklist's ticks in localStorage, read through useSyncExternalStore so the
 * server renders unticked and the browser hydrates straight to the saved ticks.
 */
function createTicksStore(storageKey: string) {
  let cachedRaw: string | null = null;
  let cached: Ticks = NO_TICKS;
  const listeners = new Set<() => void>();
  const notify = () => {
    for (const listener of listeners) listener();
  };

  return {
    subscribe(listener: () => void) {
      listeners.add(listener);
      // Another tab changing this checklist (or clearing site data) refreshes this one.
      const onStorage = (event: StorageEvent) => {
        if (event.key === null || event.key === storageKey) {
          cachedRaw = null;
          listener();
        }
      };
      window.addEventListener("storage", onStorage);
      return () => {
        listeners.delete(listener);
        window.removeEventListener("storage", onStorage);
      };
    },
    getSnapshot(): Ticks {
      let raw: string | null = null;
      try {
        raw = window.localStorage.getItem(storageKey);
      } catch {
        raw = null;
      }
      if (raw !== cachedRaw) {
        cachedRaw = raw;
        cached = parseTicks(raw);
      }
      return cached;
    },
    getServerSnapshot(): Ticks {
      return NO_TICKS;
    },
    write(next: Ticks) {
      cached = next;
      try {
        const raw = JSON.stringify(next);
        window.localStorage.setItem(storageKey, raw);
        cachedRaw = raw;
      } catch {
        // A blocked store keeps the ticks in memory for this visit.
        cachedRaw = null;
      }
      notify();
    },
    clear() {
      cached = NO_TICKS;
      cachedRaw = null;
      try {
        window.localStorage.removeItem(storageKey);
      } catch {
        // Nothing else to clear.
      }
      notify();
    },
  };
}

function ChecklistRow({
  item,
  checked,
  onToggle,
}: {
  item: TodayChecklistItem;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <label className="flex min-h-11 cursor-pointer items-start gap-3 border-t border-dashed border-divider py-3 first:border-t-0">
      <input
        type="checkbox"
        checked={checked}
        onChange={onToggle}
        className="mt-1 size-5 shrink-0 accent-ketchup"
      />
      <span className="min-w-0">
        <span
          className={
            checked
              ? "font-semibold text-ink-muted line-through decoration-1"
              : "font-semibold text-ink"
          }
        >
          {item.label}
        </span>
        {item.detail ? (
          <span className="block text-sm leading-relaxed text-ink-muted">{item.detail}</span>
        ) : null}
      </span>
    </label>
  );
}

/** The Today tab checklist: fixed times, outstanding shopping, and dish prep. */
export function TodayChecklist({ plan }: { plan: TodayPlan }) {
  const storageKey = `${STORAGE_PREFIX}${plan.eventId}`;
  const store = useMemo(() => createTicksStore(storageKey), [storageKey]);
  const done = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot);

  function toggle(id: string) {
    store.write({ ...done, [id]: !done[id] });
  }

  function reset() {
    store.clear();
  }

  const items: TodayChecklistItem[] = [
    ...plan.milestones.map((milestone) => ({
      id: `milestone:${milestone.id}`,
      label: milestone.label,
      detail: milestone.timeLabel,
    })),
    ...plan.shopping,
    ...plan.prep,
  ];
  const doneCount = items.filter((item) => done[item.id]).length;

  return (
    <div className="flex flex-col gap-4">
      <Card className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <div>
          <p className="text-lg font-bold">{plan.headcountLine}</p>
          <p className="text-sm text-ink/80">
            Planning for ~{plan.planFor} {plan.planFor === 1 ? "person" : "people"} · {plan.when}
          </p>
        </div>
        <p className="text-sm font-bold text-ink-muted">
          {doneCount} of {items.length} done
        </p>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3 lg:items-start">
        <Card>
          <h2 className="text-lg font-bold">Timeline</h2>
          <p className="mt-1 text-sm leading-relaxed text-ink-muted">
            Times use the event&apos;s own time zone.
          </p>
          <div className="mt-2">
            {plan.milestones.map((milestone) => (
              <ChecklistRow
                key={milestone.id}
                item={{
                  id: `milestone:${milestone.id}`,
                  label: milestone.label,
                  detail: milestone.timeLabel,
                }}
                checked={Boolean(done[`milestone:${milestone.id}`])}
                onToggle={() => toggle(`milestone:${milestone.id}`)}
              />
            ))}
          </div>
        </Card>

        <Card>
          <h2 className="text-lg font-bold">Still to buy</h2>
          {plan.shopping.length === 0 ? (
            <p className="mt-2 text-sm leading-relaxed text-ink/80">
              Every shopping item is ticked. Nice.
            </p>
          ) : (
            <div className="mt-2">
              {plan.shopping.map((item) => (
                <ChecklistRow
                  key={item.id}
                  item={item}
                  checked={Boolean(done[item.id])}
                  onToggle={() => toggle(item.id)}
                />
              ))}
            </div>
          )}
        </Card>

        <Card>
          <h2 className="text-lg font-bold">Make</h2>
          {plan.prep.length === 0 ? (
            <p className="mt-2 text-sm leading-relaxed text-ink/80">
              No dishes saved yet. Add them on the Menu tab.
            </p>
          ) : (
            <div className="mt-2">
              {plan.prep.map((item) => (
                <ChecklistRow
                  key={item.id}
                  item={item}
                  checked={Boolean(done[item.id])}
                  onToggle={() => toggle(item.id)}
                />
              ))}
            </div>
          )}
        </Card>
      </div>

      {doneCount > 0 ? (
        <div>
          <Button variant="outline" onClick={reset} className="min-h-11 py-2 text-sm">
            Clear ticks
          </Button>
        </div>
      ) : null}
    </div>
  );
}
