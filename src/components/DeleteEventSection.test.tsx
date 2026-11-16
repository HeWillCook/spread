import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DeleteEventSection } from "./DeleteEventSection";

const renderSection = () =>
  render(<DeleteEventSection title="Burger Night" action={vi.fn()} />);

describe("DeleteEventSection", () => {
  it("shows only the Delete event button until it is clicked", () => {
    renderSection();
    expect(screen.getByRole("button", { name: "Delete event" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Yes, delete it" })).not.toBeInTheDocument();
    expect(screen.queryByText(/permanently removes/)).not.toBeInTheDocument();
  });

  it("reveals a confirmation naming the event, with focus on the confirm button", () => {
    renderSection();
    fireEvent.click(screen.getByRole("button", { name: "Delete event" }));

    expect(
      screen.getByText(/permanently removes all RSVPs, the menu, shopping and split data/),
    ).toBeInTheDocument();
    expect(screen.getByText("Burger Night")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Yes, delete it" })).toHaveFocus();
    expect(screen.queryByRole("button", { name: "Delete event" })).not.toBeInTheDocument();
  });

  it("hides the confirmation again when Cancel is pressed", () => {
    renderSection();
    fireEvent.click(screen.getByRole("button", { name: "Delete event" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(screen.queryByRole("button", { name: "Yes, delete it" })).not.toBeInTheDocument();
    expect(screen.queryByText(/permanently removes/)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Delete event" })).toBeInTheDocument();
  });

  it("submits the bound delete action from the confirmation", async () => {
    const action = vi.fn();
    render(<DeleteEventSection title="Burger Night" action={action} />);
    fireEvent.click(screen.getByRole("button", { name: "Delete event" }));
    fireEvent.click(screen.getByRole("button", { name: "Yes, delete it" }));

    await waitFor(() => expect(action).toHaveBeenCalledTimes(1));
    expect(action.mock.calls[0][0]).toBeInstanceOf(FormData);
  });
});
