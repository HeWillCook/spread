import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CopyReminderButton } from "./CopyReminderButton";

describe("CopyReminderButton", () => {
  it("copies a personal reminder with the event link and reports success", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
    render(<CopyReminderButton name="Dana" title="Burger Night" url="https://cookout.test/e/abc" />);
    fireEvent.click(screen.getByRole("button", { name: "Copy reminder for Dana" }));
    expect(await screen.findByRole("status")).toHaveTextContent("Reminder copied");
    expect(writeText).toHaveBeenCalledWith("Hi Dana! Can you let me know if you're coming to Burger Night? It helps me plan the food. RSVP here: https://cookout.test/e/abc");
  });

  it("keeps the complete message available when clipboard access fails", async () => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: vi.fn().mockRejectedValue(new Error("denied")) },
    });
    render(<CopyReminderButton name="Eli" title="Sunday lunch" url="https://cookout.test/e/lunch" />);
    fireEvent.click(screen.getByRole("button", { name: "Copy reminder for Eli" }));
    const message = await screen.findByLabelText("Reminder message for Eli");
    expect(message).toHaveValue("Hi Eli! Can you let me know if you're coming to Sunday lunch? It helps me plan the food. RSVP here: https://cookout.test/e/lunch");
    expect(screen.getByRole("status")).toHaveTextContent("Select the message below");
  });
});
