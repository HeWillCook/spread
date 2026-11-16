"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { TabBar, type Tab } from "./ui/TabBar";

/** The href of the tab whose path is (or contains) the current path; the longest match wins. */
export function activeTabHref(tabs: Tab[], pathname: string): string {
  const path = pathname.replace(/\/+$/, "");
  let best = "";
  for (const { href } of tabs) {
    if ((path === href || path.startsWith(`${href}/`)) && href.length > best.length) best = href;
  }
  return best;
}

/**
 * The tab to mark current. The event index is the Guests tab, but Edit and the
 * Kitchen sheet are separate screens reached from the menu: neither pretends to
 * be one of the five sections.
 */
export function currentTabHref(tabs: Tab[], base: string, pathname: string): string {
  const path = pathname.replace(/\/+$/, "");
  if (path === `${base}/prep` || path === `${base}/edit` || path.startsWith(`${base}/edit/`)) {
    return "";
  }
  return activeTabHref(tabs, path);
}

const ICON_PROPS = {
  width: 22,
  height: 22,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.7,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

const ICONS: Record<string, ReactNode> = {
  Guests: (
    <svg {...ICON_PROPS}>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3.5 19.5c.5-3 2.7-4.8 5.5-4.8s5 1.8 5.5 4.8" />
      <circle cx="16.8" cy="9" r="2.4" />
      <path d="M16.2 14.7c2.2.2 3.9 1.8 4.3 4.3" />
    </svg>
  ),
  Menu: (
    <svg {...ICON_PROPS}>
      <path d="M7 3v7.5a2.2 2.2 0 0 0 4.4 0V3" />
      <path d="M9.2 10.7V21" />
      <path d="M17.4 3c-1.5 1.3-2.2 3.3-2.2 5.6 0 1.7.7 2.9 2.2 3.4V21" />
    </svg>
  ),
  Shopping: (
    <svg {...ICON_PROPS}>
      <path d="M4 9.5h16l-1.4 10a1.5 1.5 0 0 1-1.5 1.3H6.9a1.5 1.5 0 0 1-1.5-1.3L4 9.5Z" />
      <path d="M8.4 9.5 11 3.8M15.6 9.5 13 3.8" />
    </svg>
  ),
  Split: (
    <svg {...ICON_PROPS}>
      <path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3Z" />
      <path d="M9 8.5h6M9 13h6" />
    </svg>
  ),
  Today: (
    <svg {...ICON_PROPS}>
      <rect x="3.5" y="5" width="17" height="16" rx="2.5" />
      <path d="M3.5 10h17M8 3v4M16 3v4" />
      <path d="m9 15.2 2 2 4-4.2" />
    </svg>
  ),
};

/** The event page tab bars: a fixed bottom bar on phones, a top row on desktop. */
export function EventTabs({ eventId, accent }: { eventId: string; accent?: string }) {
  const pathname = usePathname();
  const base = `/host/events/${encodeURIComponent(eventId)}`;
  const tabs: Tab[] = [
    { label: "Guests", href: base, icon: ICONS.Guests },
    { label: "Menu", href: `${base}/menu`, icon: ICONS.Menu },
    { label: "Shopping", href: `${base}/shopping`, icon: ICONS.Shopping },
    { label: "Split", href: `${base}/split`, icon: ICONS.Split },
    { label: "Today", href: `${base}/today`, icon: ICONS.Today },
  ];
  const activeHref = currentTabHref(tabs, base, pathname);
  return (
    <>
      <TabBar tabs={tabs} activeHref={activeHref} accent={accent} />
      <TabBar
        tabs={tabs}
        activeHref={activeHref}
        variant="bottom"
        label="Event sections"
      />
    </>
  );
}
