import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const usePathname = vi.fn();
vi.mock("next/navigation", () => ({ usePathname: () => usePathname() }));

import { EventTabs } from "./EventTabs";

function sections() {
  return screen.getByRole("navigation", { name: "Sections" });
}

function current() {
  return screen.queryAllByRole("link", { current: "page" });
}

describe("EventTabs", () => {
  it("links the five tabs under the event in the desktop row", () => {
    usePathname.mockReturnValue("/host/events/ev1");
    render(<EventTabs eventId="ev1" />);
    const links = within(sections()).getAllByRole("link");
    expect(links.map((l) => [l.textContent, l.getAttribute("href")])).toEqual([
      ["Guests", "/host/events/ev1"],
      ["Menu", "/host/events/ev1/menu"],
      ["Shopping", "/host/events/ev1/shopping"],
      ["Split", "/host/events/ev1/split"],
      ["Today", "/host/events/ev1/today"],
    ]);
  });

  it("renders the same five sections in the fixed phone bar", () => {
    usePathname.mockReturnValue("/host/events/ev1");
    render(<EventTabs eventId="ev1" />);
    const bar = screen.getByRole("navigation", { name: "Event sections" });
    expect(within(bar).getAllByRole("link").map((l) => l.textContent)).toEqual([
      "Guests",
      "Menu",
      "Shopping",
      "Split",
      "Today",
    ]);
    // Each phone link has an icon plus its short label.
    expect(bar.querySelectorAll(".tab-icon")).toHaveLength(5);
  });

  it("highlights Guests on the event index in both bars", () => {
    usePathname.mockReturnValue("/host/events/ev1");
    render(<EventTabs eventId="ev1" />);
    const currentLinks = current();
    expect(currentLinks).toHaveLength(2);
    for (const link of currentLinks) expect(link).toHaveTextContent("Guests");
  });

  it.each([
    ["/host/events/ev1/menu", "Menu"],
    ["/host/events/ev1/shopping", "Shopping"],
    ["/host/events/ev1/split", "Split"],
    ["/host/events/ev1/today", "Today"],
    ["/host/events/ev1/menu/", "Menu"],
  ])("highlights the tab for %s", (path, label) => {
    usePathname.mockReturnValue(path);
    render(<EventTabs eventId="ev1" />);
    const currentLinks = current();
    expect(currentLinks.length).toBeGreaterThan(0);
    for (const link of currentLinks) expect(link).toHaveTextContent(label);
  });

  it.each(["/host/events/ev1/prep", "/host/events/ev1/prep/", "/host/events/ev1/edit"])(
    "marks no section current on %s",
    (path) => {
      usePathname.mockReturnValue(path);
      render(<EventTabs eventId="ev1" />);
      expect(current()).toHaveLength(0);
    },
  );
});
