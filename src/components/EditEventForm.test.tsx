import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { EditEventForm } from "./EditEventForm";

const initial = {
  title: "Burger Night",
  startsAt: "2026-11-14T19:00",
  location: "The patio",
  timezone: "America/Chicago",
};

describe("EditEventForm", () => {
  it("is prefilled with the event's current values", () => {
    render(<EditEventForm initial={initial} action={vi.fn()} backHref="/host/events/e1" />);
    expect(screen.getByLabelText("What's the occasion?")).toHaveValue("Burger Night");
    expect(screen.getByLabelText("Date and time")).toHaveValue("2026-11-14T19:00");
    expect(screen.getByLabelText("Where?")).toHaveValue("The patio");
    expect(screen.getByText("Time in America/Chicago")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Cancel" })).toHaveAttribute("href", "/host/events/e1");
  });

  it("sends the edited values and the event's time zone", async () => {
    const action = vi.fn().mockResolvedValue({ error: null });
    render(<EditEventForm initial={initial} action={action} backHref="/x" />);
    fireEvent.change(screen.getByLabelText("What's the occasion?"), { target: { value: "Pizza Night" } });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() => expect(action).toHaveBeenCalled());
    const data = action.mock.calls[0][1] as FormData;
    expect(data.get("title")).toBe("Pizza Night");
    expect(data.get("startsAt")).toBe("2026-11-14T19:00");
    expect(data.get("location")).toBe("The patio");
    expect(data.get("timezone")).toBe("America/Chicago");
  });

  it("keeps what was typed and shows the error when the save is rejected", async () => {
    const action = vi.fn().mockResolvedValue({ error: "Where is it?" });
    render(<EditEventForm initial={initial} action={action} backHref="/x" />);
    fireEvent.change(screen.getByLabelText("What's the occasion?"), { target: { value: "Pizza Night" } });
    fireEvent.change(screen.getByLabelText("Where?"), { target: { value: "  " } });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Where is it?");
    expect(screen.getByLabelText("What's the occasion?")).toHaveValue("Pizza Night");
    expect(screen.getByLabelText("Date and time")).toHaveValue("2026-11-14T19:00");
    expect(screen.getByLabelText("Where?")).toHaveValue("  ");
  });
});
