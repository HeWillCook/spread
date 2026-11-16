import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DeleteEventSection } from "./DeleteEventSection";

const renderSection = () =>
  render(<DeleteEventSection title="Burger Night" action={vi.fn()} />);

describe("DeleteEventSection", () => {
  it("explains that deleting is reversible for 30 days", () => {
    renderSection();
    expect(screen.getByRole("button", { name: "Delete event" })).toBeInTheDocument();
    expect(
      screen.getByText(/You can undo this from your events list for 30 days\./),
    ).toBeInTheDocument();
    expect(screen.getByText("Burger Night")).toBeInTheDocument();
    expect(screen.queryByText(/permanently removes/)).not.toBeInTheDocument();
  });

  it("submits the bound delete action straight away, with no confirm step", async () => {
    const action = vi.fn();
    render(<DeleteEventSection title="Burger Night" action={action} />);

    fireEvent.click(screen.getByRole("button", { name: "Delete event" }));

    await waitFor(() => expect(action).toHaveBeenCalledTimes(1));
    expect(action.mock.calls[0][0]).toBeInstanceOf(FormData);
    expect(screen.queryByRole("button", { name: /Yes, delete it/ })).not.toBeInTheDocument();
  });

  it("shows a pending label while the delete is in flight", async () => {
    let release: (() => void) | undefined;
    const action = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          release = resolve;
        }),
    );
    render(<DeleteEventSection title="Burger Night" action={action} />);

    fireEvent.click(screen.getByRole("button", { name: "Delete event" }));

    expect(await screen.findByRole("button", { name: "Deleting..." })).toBeDisabled();
    release?.();
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Delete event" })).toBeEnabled(),
    );
  });
});
