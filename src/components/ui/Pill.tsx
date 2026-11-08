import type { ReactNode } from "react";

const tones = {
  mustard: "bg-mustard",
  cream: "bg-cream",
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
      className={`inline-flex items-center whitespace-nowrap rounded-full border-2 border-ink px-3 py-1 text-xs font-bold text-ink ${tones[tone]}`}
    >
      {children}
    </span>
  );
}
