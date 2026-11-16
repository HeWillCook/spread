import Link from "next/link";
import { EmptyState } from "@/components/EmptyState";
import { emptyShoppingLabel, planningLabel, prepSheetText, type PrepSheet } from "@/lib/prep-sheet";
import { KitchenActions } from "./KitchenActions";

function PeopleFor({ headcount }: { headcount: number }) {
  if (headcount <= 0) return null;
  return <span> for ~{headcount === 1 ? "1 person" : `${headcount} people`}</span>;
}

/**
 * A saved, host-only sheet for the counter. It shows saved RSVP/portion data and the
 * recipe's own saved steps; it never recalculates attendance live or invents directions.
 *
 * Scoped hooks for the parent's globals/print CSS: kitchen-sheet, kitchen-sheet-head,
 * kitchen-event-name, kitchen-title, kitchen-meta, kitchen-summary, kitchen-plan,
 * kitchen-headcount, kitchen-snapshot-note, kitchen-actions, kitchen-action-controls,
 * kitchen-copy-status, kitchen-print-error, kitchen-copy-fallback, kitchen-back,
 * kitchen-columns, kitchen-prep, kitchen-shopping, kitchen-section-title,
 * kitchen-empty, kitchen-empty-link, kitchen-dish, kitchen-dish-head,
 * kitchen-dish-title, kitchen-dish-servings, kitchen-ingredients, kitchen-ingredient,
 * kitchen-shopping-list, kitchen-shopping-item, kitchen-tick, kitchen-shopping-name,
 * kitchen-buy, kitchen-notes, kitchen-note, kitchen-note-status, kitchen-note-text,
 * kitchen-note-caution, kitchen-footnote.
 */
export function KitchenSheet({ sheet }: { sheet: PrepSheet }) {
  const menuHref = `/host/events/${encodeURIComponent(sheet.eventId)}/menu`;
  const plainText = prepSheetText(sheet);
  const planFor = sheet.headcount.planFor;

  return (
    <article className="kitchen-sheet flex flex-col gap-6" aria-labelledby="kitchen-title">
      <header className="kitchen-sheet-head flex flex-col gap-1">
        <h2 id="kitchen-title" className="kitchen-title">Kitchen sheet</h2>
        <p className="kitchen-event-name">{sheet.title}</p>
        <p className="kitchen-meta text-ink-muted">{sheet.when}</p>
      </header>

      <section
        className="kitchen-summary"
        aria-labelledby="kitchen-summary-title"
      >
        <h2 id="kitchen-summary-title" className="kitchen-section-title text-lg font-bold">
          {planningLabel(sheet.headcount)}
        </h2>
        <p className="kitchen-headcount mt-1 text-sm font-bold text-ink/80">{sheet.headcountLine}</p>
      </section>

      <div className="kitchen-actions flex flex-wrap items-start justify-between gap-4 print:hidden">
        <KitchenActions text={plainText} />
        <Link href={menuHref} className="kitchen-back quiet-link">
          <span aria-hidden="true">← </span>
          Back to Menu
        </Link>
      </div>

      <div className="kitchen-columns">
        <section
          className="kitchen-prep"
          aria-labelledby="kitchen-prep-title"
        >
          <h2 id="kitchen-prep-title" className="kitchen-section-title text-xl font-bold">
            Menu prep
          </h2>

          {!sheet.hasMenu ? (
            <EmptyState
              inset
              art="menu"
              title="No dishes saved yet"
              className="kitchen-empty mt-3"
              action={
                <Link
                  href={menuHref}
                  className="kitchen-empty-link inline-flex min-h-11 items-center font-bold text-ketchup underline underline-offset-4 print:hidden"
                >
                  Go to Menu
                </Link>
              }
            >
              <p>
                Add dishes and portions on Menu, then come back for a kitchen-ready
                sheet.
              </p>
            </EmptyState>
          ) : (
            <div className="mt-3 flex flex-col gap-5">
              {sheet.dishes.map((dish) => (
                <article key={dish.dishId} className="kitchen-dish break-inside-avoid">
                  <div className="kitchen-dish-head flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                    <h3 className="kitchen-dish-title text-lg font-bold leading-tight">
                      <span aria-hidden="true">{dish.emoji}</span> {dish.name}
                    </h3>
                    <p className="kitchen-dish-servings text-sm font-bold text-ink/80">
                      <span>{dish.servingsLabel}</span>
                      <PeopleFor headcount={planFor} />
                    </p>
                  </div>
                  <dl className="kitchen-ingredients mt-2 border-t-2 border-dashed border-divider">
                    {dish.ingredients.map((ingredient) => (
                      <div
                        key={ingredient.itemId}
                        className="kitchen-ingredient flex items-baseline justify-between gap-4 border-b border-dashed border-divider py-2 last:border-b-0"
                      >
                        <dt className="min-w-0">
                          <span aria-hidden="true">{ingredient.emoji}</span> {ingredient.name}
                        </dt>
                        <dd className="shrink-0 font-bold tabular-nums">{ingredient.neededLabel}</dd>
                      </div>
                    ))}
                  </dl>
                  {dish.timeLabel ? (
                    <p className="kitchen-dish-time mt-2 text-xs font-bold text-ink/80">
                      {dish.timeLabel}
                    </p>
                  ) : null}
                  {dish.steps.length > 0 ? (
                    <ol className="kitchen-steps mt-2 flex list-decimal flex-col gap-1 pl-5 text-sm leading-relaxed">
                      {dish.steps.map((step, index) => (
                        <li key={`${index}-${step.slice(0, 24)}`}>{step}</li>
                      ))}
                    </ol>
                  ) : null}
                </article>
              ))}
            </div>
          )}
        </section>

        <section
          className="kitchen-shopping"
          aria-labelledby="kitchen-shopping-title"
        >
          <h2 id="kitchen-shopping-title" className="kitchen-section-title text-xl font-bold">
            Shopping
          </h2>
          {sheet.shopping.length === 0 ? (
            <p className="mt-3 text-sm leading-relaxed text-ink/80">
              {emptyShoppingLabel(sheet)}
            </p>
          ) : (
            <ul className="kitchen-shopping-list mt-3 border-t-2 border-dashed border-divider">
              {sheet.shopping.map((item) => (
                <li
                  key={item.itemId}
                  className="kitchen-shopping-item flex items-baseline gap-2 border-b border-dashed border-divider py-2 last:border-b-0"
                >
                  <span aria-hidden="true" className="kitchen-tick" />
                  <span className="kitchen-shopping-name min-w-0 flex-1">
                    <span aria-hidden="true">{item.emoji}</span> {item.name}
                  </span>
                  <span className="kitchen-buy shrink-0 font-bold tabular-nums">{item.buyLabel}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {sheet.foodNotes.length > 0 ? (
        <section
          className="kitchen-notes"
          aria-labelledby="kitchen-notes-title"
        >
          <h2 id="kitchen-notes-title" className="kitchen-section-title text-xl font-bold">
            Food notes <span className="text-base font-bold text-ink/70">(host only)</span>
          </h2>
          <ul className="mt-3 flex flex-col gap-2">
            {sheet.foodNotes.map((note) => (
              <li key={note.guestId} className="kitchen-note text-sm leading-relaxed">
                <strong>{note.name}</strong>{" "}
                <span className="kitchen-note-status text-ink/70">
                  ({note.status === "yes" ? "going" : "maybe"})
                </span>{" "}
                <span className="kitchen-note-text">{note.notes}</span>
              </li>
            ))}
          </ul>
          <p className="kitchen-note-caution mt-3 text-xs leading-relaxed text-ink/80">
            Notes don&apos;t automatically change recipe quantities or ingredients. Check with your guest before cooking.
          </p>
        </section>
      ) : null}

      <footer className="kitchen-footnote border-t border-divider pt-4">
        <p className="text-xs leading-relaxed text-ink/80">
          Quantities use your saved RSVPs and portions. Attendance can still change.
        </p>
      </footer>
    </article>
  );
}
