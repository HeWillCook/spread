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
}: {
  children: ReactNode;
  tone?: keyof typeof tones;
}) {
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold leading-tight ${tones[tone]}`}
    >
      {children}
    </span>
  );
}
