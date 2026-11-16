import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import type { TodayPlan } from "@/lib/today-plan";
import { TodayChecklist } from "./TodayChecklist";

const plan: TodayPlan = {
  eventId: "evt-1",
  title: "Party",
  when: "Sat, Nov 14 · 7pm · Backyard",
  planFor: 8,
  headcountLine: "6 confirmed + ~2 from maybes · range 6–10",
  milestones: [
    { id: "shopping-done", label: "Shopping done", timeLabel: "9:00 AM" },
    { id: "start-prep", label: "Start prep", timeLabel: "4:00 PM" },
    { id: "set-up", label: "Set up", timeLabel: "6:00 PM" },
    { id: "guests-arrive", label: "Guests arrive", timeLabel: "7:00 PM" },
  ],
  shopping: [{ id: "shop:i1", label: "Ground beef", detail: "4 lb to buy" }],
  prep: [{ id: "prep:d1", label: "Burgers", detail: "make 12 burgers" }],
};

describe("TodayChecklist", () => {
  beforeEach(() => window.localStorage.clear());

  it("shows the headcount, milestone times and both checklists", () => {
    render(<TodayChecklist plan={plan} />);
    expect(screen.getByText("6 confirmed + ~2 from maybes · range 6–10")).toBeInTheDocument();
    expect(screen.getByText("4:00 PM")).toBeInTheDocument();
    expect(screen.getByText("4 lb to buy")).toBeInTheDocument();
    expect(screen.getByText("make 12 burgers")).toBeInTheDocument();
    expect(screen.getAllByRole("checkbox")).toHaveLength(6);
  });

  it("remembers ticks in localStorage per event", () => {
    const { unmount } = render(<TodayChecklist plan={plan} />);
    fireEvent.click(screen.getByRole("checkbox", { name: /Burgers/ }));

    expect(window.localStorage.getItem("spread:today:evt-1")).toContain("prep:d1");
    expect(screen.getByText("1 of 6 done")).toBeInTheDocument();

    unmount();
    render(<TodayChecklist plan={plan} />);
    expect(screen.getByRole("checkbox", { name: /Burgers/ })).toBeChecked();
  });

  it("clears the ticks again", () => {
    render(<TodayChecklist plan={plan} />);
    fireEvent.click(screen.getByRole("checkbox", { name: /Shopping done/ }));
    fireEvent.click(screen.getByRole("button", { name: "Clear ticks" }));

    expect(window.localStorage.getItem("spread:today:evt-1")).toBeNull();
    expect(screen.getByRole("checkbox", { name: /Shopping done/ })).not.toBeChecked();
  });
});
