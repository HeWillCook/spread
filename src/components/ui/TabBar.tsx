import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";

export type Tab = { label: string; href: string; icon?: ReactNode };

/**
 * The event section navigation. `top` is the desktop row under the masthead;
 * `bottom` is the fixed phone tab bar with an icon over each short label.
 */
export function TabBar({
  tabs,
  activeHref,
  accent,
  variant = "top",
  label = "Sections",
}: {
  tabs: Tab[];
  activeHref: string;
  /** Event pages tint the ketchup bar with their occasion colour. */
  accent?: string;
  variant?: "top" | "bottom";
  label?: string;
}) {
  const bottom = variant === "bottom";
  return (
    <nav
      className={bottom ? "event-tab-bar" : "event-tabs"}
      aria-label={label}
      style={accent ? ({ "--tab-accent": accent } as CSSProperties) : undefined}
    >
      {tabs.map((tab) => {
        const active = tab.href === activeHref;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            aria-label={bottom ? tab.label : undefined}
            className={bottom ? "tab-link tab-link-bottom" : "tab-link"}
          >
            {bottom && tab.icon ? (
              <span className="tab-icon" aria-hidden="true">
                {tab.icon}
              </span>
            ) : null}
            <span className="tab-label">{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
