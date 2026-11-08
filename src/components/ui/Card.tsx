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
      className={`rounded-[14px] border-2 border-ink bg-white p-4 text-ink ${className}`}
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
      className={`flex items-center justify-between gap-3 border-t-2 border-dashed border-divider py-3 first:border-t-0 first:pt-0 last:pb-0 ${className}`}
    >
      {children}
    </div>
  );
}
