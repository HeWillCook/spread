import type { ReactNode } from "react";

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`ticket-surface rounded-2xl bg-paper p-4 text-ink sm:p-6 ${className}`}
    >
      {children}
    </div>
  );
}

/** A row inside a Card; consecutive rows get a dashed divider between them. */
export function CardRow({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`flex items-center justify-between gap-3 border-t border-dashed border-divider py-3 first:border-t-0 first:pt-0 last:pb-0 ${className}`}
    >
      {children}
    </div>
  );
}
