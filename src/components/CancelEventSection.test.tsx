import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CancelEventSection } from "./CancelEventSection";

describe("CancelEventSection", () => {
  it("offers Cancel event for a live event and posts the bound action", async () => {
    const action = vi.fn();
    render(<CancelEventSection cancelled={false} action={action} />);

    expect(screen.getByRole("heading", { name: "Cancel event" })).toBeInTheDocument();
    expect(screen.getByText(/Guests keep the link/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Reinstate event" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Cancel event" }));
    await waitFor(() => expect(action).toHaveBeenCalledTimes(1));
    expect(action.mock.calls[0][0]).toBeInstanceOf(FormData);
  });

  it("offers Reinstate event once cancelled", async () => {
    const action = vi.fn();
    render(<CancelEventSection cancelled action={action} />);

    expect(screen.getByRole("heading", { name: "Event cancelled" })).toBeInTheDocument();
    expect(screen.getByText(/can't RSVP/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Cancel event" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Reinstate event" }));
    await waitFor(() => expect(action).toHaveBeenCalledTimes(1));
  });
});
