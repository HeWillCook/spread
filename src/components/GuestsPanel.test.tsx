import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { GuestsOverview } from "@/services/guestsOverview";
import { breakdownLine, GuestsPanel, type GuestsFormAction } from "./GuestsPanel";

const overview: GuestsOverview = {
  headcount: { confirmed: 12, maybeHeads: 5, expectedFromMaybes: 2.5, planFor: 15, low: 12, high: 17 },
  counts: { yes: 8, maybe: 3, no: 1 },
  guests: [
    { id: "1", name: "Alex", status: "yes", plusOneNames: ["Sam", "Pat"], foodNotes: "no peanuts" },
    { id: "2", name: "Bea", status: "maybe", plusOneNames: [], foodNotes: null },
    { id: "3", name: "Cy", status: "no", plusOneNames: [], foodNotes: null },
  ],
  noReply: null,
};

const ok: GuestsFormAction = async () => ({ error: null });

function renderPanel(
  over: Partial<GuestsOverview> = {},
  actions: {
    percent?: GuestsFormAction;
    invitees?: GuestsFormAction;
    remove?: GuestsFormAction;
  } = {},
) {
  return render(
    <GuestsPanel
      overview={{ ...overview, ...over }}
      maybePercent={50}
      setMaybePercentAction={actions.percent ?? ok}
      addInviteesAction={actions.invitees ?? ok}
      removeGuestAction={actions.remove ?? ok}
      invitation={{ title: "Burger Night", url: "https://cookout.test/e/burger" }}
    />,
  );
}

describe("GuestsPanel", () => {
  it("shows the headcount breakdown line with the range", () => {
    expect(breakdownLine(overview.headcount)).toBe(
      "12 confirmed + about 3 from maybes = plan for ~15 (range 12–17)",
    );
    renderPanel();
    expect(
      screen.getByText("12 confirmed + about 3 from maybes = plan for ~15 (range 12–17)"),
    ).toBeInTheDocument();
  });

  it("drops the maybes part and a one-number range when there are no maybes to plan for", () => {
    expect(
      breakdownLine({ confirmed: 12, maybeHeads: 0, expectedFromMaybes: 0, planFor: 12, low: 12, high: 12 }),
    ).toBe("12 confirmed = plan for ~12");
    // Maybes exist but the host plans for none of them: nothing to add, yet the range is real.
    expect(
      breakdownLine({ confirmed: 12, maybeHeads: 4, expectedFromMaybes: 0, planFor: 12, low: 12, high: 16 }),
    ).toBe("12 confirmed = plan for ~12 (range 12–16)");
    expect(
      breakdownLine({ confirmed: 0, maybeHeads: 0, expectedFromMaybes: 0, planFor: 0, low: 0, high: 0 }),
    ).toBe("0 confirmed = plan for ~0");
  });

  it("shows yes / maybe / no counts", () => {
    renderPanel();
    expect(screen.getByText("8 yes")).toBeInTheDocument();
    expect(screen.getByText("3 maybe")).toBeInTheDocument();
    expect(screen.getByText("1 no")).toBeInTheDocument();
  });

  it("lists guests with plus-ones and food notes", () => {
    renderPanel();
    expect(screen.getByText("Alex")).toBeInTheDocument();
    expect(screen.getByText("+ Sam, Pat")).toBeInTheDocument();
    expect(screen.getByText("Food notes: no peanuts")).toBeInTheDocument();
    expect(screen.getByText("Bea")).toBeInTheDocument();
  });

  it("shows an empty state with no guests", () => {
    renderPanel({ guests: [], counts: { yes: 0, maybe: 0, no: 0 } });
    expect(screen.getByText(/No answers yet/)).toBeInTheDocument();
  });

  it("hides the no-reply list without an invitee list and shows it when present", () => {
    const { unmount } = renderPanel();
    expect(screen.queryByText("No reply yet")).not.toBeInTheDocument();
    unmount();

    renderPanel({ noReply: ["Dana", "Eli"] });
    expect(screen.getByText("No reply yet")).toBeInTheDocument();
    expect(screen.getByText("Dana")).toBeInTheDocument();
    expect(screen.getByText("Eli")).toBeInTheDocument();
    expect(screen.getByText("2 no reply")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Copy reminder for Dana" })).toBeInTheDocument();
    expect(screen.getByText(/People who haven't replied aren't included/)).toBeInTheDocument();
  });

  it("summarizes food notes from attending and maybe guests for planning", () => {
    renderPanel({ guests: [
      ...overview.guests,
      { id: "4", name: "Dee", status: "maybe", plusOneNames: [], foodNotes: "Vegetarian" },
      { id: "5", name: "Eli", status: "no", plusOneNames: [], foodNotes: "No dairy" },
    ] });
    const summary = screen.getByRole("region", { name: "Food notes to plan around" });
    expect(summary).toHaveTextContent("Alex: no peanuts");
    expect(summary).toHaveTextContent("Dee: Vegetarian");
    expect(summary).not.toHaveTextContent("Eli");
  });

  it("submits the maybe percent and shows a friendly error from the action", async () => {
    const percent = vi.fn<GuestsFormAction>().mockResolvedValue({
      error: "Maybe percent must be a whole number from 0 to 100",
    });
    renderPanel({}, { percent });

    const input = screen.getByLabelText("How many maybes will show up?");
    expect(input).toHaveValue(50);
    fireEvent.change(input, { target: { value: "75" } });
    fireEvent.click(screen.getByRole("button", { name: "Save percent" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Maybe percent must be a whole number from 0 to 100",
    );
    expect(percent.mock.calls[0][1].get("percent")).toBe("75");
  });

  it("sends pasted invitee names to the action", async () => {
    const invitees = vi.fn<GuestsFormAction>().mockResolvedValue({ error: null });
    renderPanel({}, { invitees });

    fireEvent.change(screen.getByLabelText(/Who did you invite/), {
      target: { value: "Dana\nEli" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add names" }));

    await waitFor(() => expect(invitees).toHaveBeenCalled());
    expect(invitees.mock.calls[0][1].get("names")).toBe("Dana\nEli");
  });

  it("asks before removing a guest and only then calls the action with their id", async () => {
    const remove = vi.fn<GuestsFormAction>().mockResolvedValue({ error: null });
    renderPanel({}, { remove });

    fireEvent.click(screen.getByRole("button", { name: "Remove Alex" }));
    expect(screen.getByText("Really remove Alex?")).toBeInTheDocument();
    expect(remove).not.toHaveBeenCalled();

    // "No" backs out without calling anything.
    fireEvent.click(screen.getByRole("button", { name: "No, keep Alex" }));
    expect(screen.queryByText("Really remove Alex?")).not.toBeInTheDocument();
    expect(remove).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Remove Alex" }));
    fireEvent.click(screen.getByRole("button", { name: "Yes, remove Alex" }));
    await waitFor(() => expect(remove).toHaveBeenCalledTimes(1));
    expect(remove.mock.calls[0][1].get("guestId")).toBe("1");
  });

  it("flags guests with the same name as a possible duplicate", () => {
    const { unmount } = renderPanel();
    expect(screen.queryByText("possible duplicate")).not.toBeInTheDocument();
    unmount();

    renderPanel({
      guests: [
        ...overview.guests,
        { id: "4", name: " alex ", status: "maybe", plusOneNames: [], foodNotes: null },
      ],
    });
    expect(screen.getAllByText("possible duplicate")).toHaveLength(2);
  });
});
