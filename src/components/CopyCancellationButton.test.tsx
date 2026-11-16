import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CopyCancellationButton } from "./CopyCancellationButton";

describe("CopyCancellationButton", () => {
  it("copies a cancellation message with the event title and when", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
    render(<CopyCancellationButton title="Burger Night" when="Sat, Nov 14 · 7pm" />);

    fireEvent.click(screen.getByRole("button", { name: "Copy cancellation message" }));

    expect(await screen.findByRole("status")).toHaveTextContent("Cancellation copied");
    expect(writeText).toHaveBeenCalledWith(
      "Sorry everyone, Burger Night on Sat, Nov 14 · 7pm is cancelled. Hope to see you at the next one.",
    );
  });

  it("keeps the complete message available when clipboard access fails", async () => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: vi.fn().mockRejectedValue(new Error("denied")) },
    });
    render(<CopyCancellationButton title="Sunday lunch" when="Sun, Nov 15 · noon" />);

    fireEvent.click(screen.getByRole("button", { name: "Copy cancellation message" }));

    const message = await screen.findByLabelText("Cancellation message");
    expect(message).toHaveValue(
      "Sorry everyone, Sunday lunch on Sun, Nov 15 · noon is cancelled. Hope to see you at the next one.",
    );
    expect(screen.getByRole("status")).toHaveTextContent("Select the message below");
  });
});
