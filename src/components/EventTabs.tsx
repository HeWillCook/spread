"use client";

import { usePathname } from "next/navigation";
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

/** The event page tab bar, highlighting the tab for the current route. */
export function EventTabs({ eventId }: { eventId: string }) {
  const pathname = usePathname();
  const base = `/host/events/${encodeURIComponent(eventId)}`;
  const tabs: Tab[] = [
    { label: "Guests", href: base },
    { label: "Menu", href: `${base}/menu` },
    { label: "Shopping", href: `${base}/shopping` },
    { label: "Split", href: `${base}/split` },
  ];
  return <TabBar tabs={tabs} activeHref={activeTabHref(tabs, pathname)} />;
}
