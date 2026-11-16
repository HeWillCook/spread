/** Guest-facing note that the host moved the party: "Updated 3 days ago: now …". */
export function UpdatedDetailsNotice({
  relative,
  when,
  location,
}: {
  /** "today", "yesterday", "3 days ago". */
  relative: string;
  /** Pre-formatted day and time, e.g. "Sat, Nov 14 · 7pm". */
  when: string;
  location: string;
}) {
  return (
    <div
      role="status"
      className="rounded-2xl border-[1.5px] border-divider-strong bg-paper px-4 py-3"
    >
      <p className="text-sm leading-relaxed text-ink">
        <strong className="font-bold">Updated {relative}:</strong> now {when} at {location}.
      </p>
    </div>
  );
}
