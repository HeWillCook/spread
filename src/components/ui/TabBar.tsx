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
    <nav className="flex gap-2" aria-label="Sections">
      {tabs.map((tab) => {
        const active = tab.href === activeHref;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={
              active
                ? "flex min-h-11 flex-1 items-center justify-center rounded-xl border-2 border-ink bg-ketchup px-3 text-sm font-bold text-cream"
                : "flex min-h-11 flex-1 items-center justify-center rounded-xl border-2 border-transparent px-3 text-sm font-bold text-ink opacity-60"
            }
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
