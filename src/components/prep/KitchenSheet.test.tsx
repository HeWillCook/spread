import { render, screen, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { computeHeadcount } from "@/domain/headcount";
import { buildPrepSheet } from "@/lib/prep-sheet";
import type { MenuDish } from "@/services/menu";

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: ReactNode;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

import { KitchenSheet } from "./KitchenSheet";

const dish: MenuDish = {
  dishId: "dish-burgers",
  servingsPerPerson: 1,
  isStarter: false,
  recipe: {
    id: "recipe-burgers",
    name: "Burgers",
    emoji: "🍔",
    defaultServingsPerPerson: 1,
    items: [
      {
        id: "beef",
        name: "Ground beef",
        emoji: "🥩",
        perServing: 0.5,
        unit: "lb",
        buyUnit: "pack",
        unitsPerBuy: 1,
        priceCents: 650,
      },
    ],
  },
};

const event = {
  id: "ev1",
  title: "Burger Night",
  startsAt: new Date("2026-11-14T19:00:00Z"),
  location: "Will's backyard",
  timezone: "UTC",
};

function sheet(dishes: MenuDish[]) {
  return buildPrepSheet({
    event,
    dishes,
    headcount: computeHeadcount([{ status: "yes", plusOnes: 0 }], 0.5),
    guests: [{ id: "g1", name: "Dana", status: "yes", foodNotes: "No dairy" }],
  });
}

describe("KitchenSheet", () => {
  it("shows the saved event, scaled prep, shopping and host-only notes", () => {
    render(<KitchenSheet sheet={sheet([dish])} />);

    expect(screen.getByRole("heading", { level: 2, name: "Kitchen sheet" })).toBeInTheDocument();
    expect(screen.getByText("Burger Night")).toBeInTheDocument();
    expect(screen.getByText("Sat, Nov 14 · 7pm · Will's backyard")).toBeInTheDocument();
    expect(screen.getByText(/Planning for ~1 person/)).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 3, name: /Burgers/ })).toBeInTheDocument();
    expect(screen.getByText("1 burger")).toBeInTheDocument();
    expect(screen.getByText("0.5 lb")).toBeInTheDocument();
    expect(screen.getByText("1 pack")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Food notes/ })).toBeInTheDocument();
    expect(screen.getByText("No dairy")).toBeInTheDocument();
    expect(screen.getByText(/don't automatically change recipe quantities/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to Menu" })).toHaveAttribute(
      "href",
      "/host/events/ev1/menu",
    );
  });

  it("shows the dish time and numbered steps", () => {
    const withSteps: MenuDish = {
      ...dish,
      recipe: {
        ...dish.recipe,
        prepMinutes: 15,
        cookMinutes: 20,
        steps: ["Form the patties.", "Grill 4 minutes a side."],
      },
    };
    render(<KitchenSheet sheet={sheet([withSteps])} />);

    expect(screen.getByText("Prep 15 min · Cook 20 min · Total 35 min")).toBeInTheDocument();
    const steps = screen.getByText("Form the patties.").closest("ol");
    expect(steps?.tagName).toBe("OL");
    expect(within(steps as HTMLElement).getAllByRole("listitem")).toHaveLength(2);
  });

  it("explains zero saved portions without implying guests have not been counted", () => {
    render(<KitchenSheet sheet={sheet([{ ...dish, servingsPerPerson: 0 }])} />);
    expect(screen.getByText("Nothing to buy for the saved portions.")).toBeInTheDocument();
    expect(screen.queryByText(/once guests are counted/)).not.toBeInTheDocument();
  });

  it("links an empty menu back to Menu instead of showing blank quantities", () => {
    render(<KitchenSheet sheet={sheet([])} />);

    expect(screen.getByText("No dishes saved yet")).toBeInTheDocument();
    const links = screen.getAllByRole("link", { name: /Menu/ });
    expect(links.some((link) => link.getAttribute("href") === "/host/events/ev1/menu")).toBe(true);
  });
});
