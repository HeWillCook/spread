import Link from "next/link";

export type Tab = { label: string; href: string };

export function TabBar({
  tabs,
  activeHref,
}: {
  tabs: Tab[];
  activeHref: string;
}) {
  return (
    <nav className="flex gap-1 overflow-x-auto" aria-label="Sections">
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
