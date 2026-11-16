import type { ReactNode } from "react";

const tones = {
  mustard: "bg-mustard text-ink",
  cream: "bg-cream/70 text-ink",
  pickle: "bg-pickle text-paper",
  quiet: "bg-transparent text-ink-muted ring-1 ring-inset ring-ink/25",
} as const;

export function Pill({
  children,
  tone = "mustard",
  compact = false,
}: {
  children: ReactNode;
  tone?: keyof typeof tones;
  /** Tighter pill for the dashboard glance row. */
  compact?: boolean;
}) {
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-full font-semibold leading-tight ${
        compact ? "px-2 py-0.5 text-[0.6875rem]" : "px-2.5 py-1 text-xs"
      } ${tones[tone]}`}
    >
      {children}
    </span>
  );
}
