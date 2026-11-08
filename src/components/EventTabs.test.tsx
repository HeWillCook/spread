import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const usePathname = vi.fn();
vi.mock("next/navigation", () => ({ usePathname: () => usePathname() }));

import { EventTabs } from "./EventTabs";

function current() {
  return screen.getByRole("link", { current: "page" });
}

describe("EventTabs", () => {
  it("links the four tabs under the event", () => {
    usePathname.mockReturnValue("/host/events/ev1");
    render(<EventTabs eventId="ev1" />);
    const links = screen.getAllByRole("link");
    expect(links.map((l) => [l.textContent, l.getAttribute("href")])).toEqual([
      ["Guests", "/host/events/ev1"],
      ["Menu", "/host/events/ev1/menu"],
      ["Shopping", "/host/events/ev1/shopping"],
      ["Split", "/host/events/ev1/split"],
    ]);
  });

  it("highlights Guests on the event index", () => {
    usePathname.mockReturnValue("/host/events/ev1");
    render(<EventTabs eventId="ev1" />);
    expect(current()).toHaveTextContent("Guests");
  });

  it.each([
    ["/host/events/ev1/menu", "Menu"],
    ["/host/events/ev1/shopping", "Shopping"],
    ["/host/events/ev1/split", "Split"],
    ["/host/events/ev1/menu/", "Menu"],
  ])("highlights the tab for %s", (path, label) => {
    usePathname.mockReturnValue(path);
    render(<EventTabs eventId="ev1" />);
    expect(current()).toHaveTextContent(label);
  });
});
