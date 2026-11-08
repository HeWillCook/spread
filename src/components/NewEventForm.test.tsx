import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { NewEventForm } from "./NewEventForm";

describe("NewEventForm", () => {
  it("sends the title, date/time, location and the browser time zone", async () => {
    const action = vi.fn().mockResolvedValue({ error: null });
    render(<NewEventForm action={action} />);

    fireEvent.change(screen.getByLabelText("What's the occasion?"), { target: { value: "Cookout" } });
    fireEvent.change(screen.getByLabelText("Date and time"), { target: { value: "2026-11-14T19:00" } });
    fireEvent.change(screen.getByLabelText("Where?"), { target: { value: "Backyard" } });
    fireEvent.click(screen.getByRole("button", { name: "Create event" }));

    await waitFor(() => expect(action).toHaveBeenCalled());
    const data = action.mock.calls[0][1] as FormData;
    expect(data.get("title")).toBe("Cookout");
    expect(data.get("startsAt")).toBe("2026-11-14T19:00");
    expect(data.get("location")).toBe("Backyard");
    expect(data.get("timezone")).toBe(Intl.DateTimeFormat().resolvedOptions().timeZone);
  });

  it("shows an error returned by the action", async () => {
    const action = vi.fn().mockResolvedValue({ error: "Where is it?" });
    render(<NewEventForm action={action} />);
    fireEvent.change(screen.getByLabelText("What's the occasion?"), { target: { value: "x" } });
    fireEvent.change(screen.getByLabelText("Date and time"), { target: { value: "2026-11-14T19:00" } });
    fireEvent.change(screen.getByLabelText("Where?"), { target: { value: "y" } });
    fireEvent.click(screen.getByRole("button", { name: "Create event" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Where is it?");
  });
});
