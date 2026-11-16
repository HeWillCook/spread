import Link from "next/link";
import type { CSSProperties } from "react";

export type Tab = { label: string; href: string };

export function TabBar({
  tabs,
  activeHref,
  accent,
}: {
  tabs: Tab[];
  activeHref: string;
  /** Event pages tint the ketchup bar with their occasion colour. */
  accent?: string;
}) {
  return (
    <nav
      className="flex gap-1 overflow-x-auto"
      aria-label="Sections"
      style={accent ? ({ "--tab-accent": accent } as CSSProperties) : undefined}
    >
      {tabs.map((tab) => {
        const active = tab.href === activeHref;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className="tab-link"
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
