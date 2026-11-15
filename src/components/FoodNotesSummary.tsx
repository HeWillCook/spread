import type { GuestRow } from "@/services/guestsOverview";

/** Host-only planning context. Never pass these notes to a public event page. */
export function FoodNotesSummary({ guests }: { guests: Pick<GuestRow, "id" | "name" | "status" | "foodNotes">[] }) {
  const notes = guests.filter((g) => g.status !== "no" && g.foodNotes);
  if (notes.length === 0) return null;
  return (
    <section aria-label="Food notes to plan around" className="rounded-2xl border-l-[5px] border-mustard bg-paper p-5 sm:p-6">
      <h2 className="mb-2 text-xl">Food notes to plan around</h2>
      <ul className="flex flex-col gap-2 text-sm leading-relaxed">
        {notes.map((g) => <li key={g.id}><strong>{g.name}:</strong> {g.foodNotes}</li>)}
      </ul>
      <p className="mt-3 text-xs leading-relaxed text-ink-muted">From going and maybe guests. Check ingredients with them before you cook; quantities don&apos;t account for these notes automatically.</p>
    </section>
  );
}
