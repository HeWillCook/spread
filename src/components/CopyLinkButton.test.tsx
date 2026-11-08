import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CopyLinkButton } from "./CopyLinkButton";

const URL = "https://cookout.example/e/abc12345";

function mockClipboard(writeText: (text: string) => Promise<void>) {
  Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
}

afterEach(() => {
  Reflect.deleteProperty(navigator, "clipboard");
});

describe("CopyLinkButton", () => {
  it("shows the link and copies it", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    mockClipboard(writeText);
    render(<CopyLinkButton url={URL} />);
    expect(screen.getByText(URL)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Copy link" }));

    await waitFor(() => expect(screen.getByRole("button", { name: "Copied!" })).toBeInTheDocument());
    expect(writeText).toHaveBeenCalledWith(URL);
  });

  it("tells the host to copy by hand when the clipboard is unavailable", async () => {
    mockClipboard(vi.fn().mockRejectedValue(new Error("denied")));
    render(<CopyLinkButton url={URL} />);

    fireEvent.click(screen.getByRole("button", { name: "Copy link" }));

    expect(await screen.findByText(/Couldn't copy automatically/)).toBeInTheDocument();
  });
});
