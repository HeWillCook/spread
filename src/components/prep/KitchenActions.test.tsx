import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { KitchenActions } from "./KitchenActions";

const plainText = "Burger Night\nSat, Nov 14 · 7pm\n\nMenu prep\n- Ground beef: 1.5 lb";

function setClipboard(value: unknown) {
  Object.defineProperty(navigator, "clipboard", { configurable: true, value });
}

afterEach(() => {
  vi.restoreAllMocks();
  setClipboard(undefined);
});

describe("KitchenActions", () => {
  it("reports a copied sheet only after the clipboard write resolves", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    setClipboard({ writeText });
    render(<KitchenActions text={plainText} />);

    fireEvent.click(screen.getByRole("button", { name: "Copy kitchen sheet" }));

    expect(await screen.findByText(/Kitchen sheet copied/)).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Kitchen sheet copied");
    expect(writeText).toHaveBeenCalledWith(plainText);
    expect(screen.queryByLabelText("Kitchen sheet text")).not.toBeInTheDocument();
  });

  it("offers the full sheet as selectable text when the clipboard rejects", async () => {
    setClipboard({ writeText: vi.fn().mockRejectedValue(new Error("denied")) });
    render(<KitchenActions text={plainText} />);

    fireEvent.click(screen.getByRole("button", { name: "Copy kitchen sheet" }));

    const fallback = await screen.findByLabelText("Kitchen sheet text");
    expect(fallback).toHaveValue(plainText);
    expect(screen.getByRole("status")).toHaveTextContent("Select the text below");
  });

  it("offers the same fallback when the clipboard API is missing", async () => {
    setClipboard(undefined);
    render(<KitchenActions text={plainText} />);

    fireEvent.click(screen.getByRole("button", { name: "Copy kitchen sheet" }));

    expect(await screen.findByLabelText("Kitchen sheet text")).toHaveValue(plainText);
  });

  it("prints through the browser when print is available", () => {
    const print = vi.fn();
    Object.defineProperty(window, "print", { configurable: true, value: print });
    render(<KitchenActions text={plainText} />);

    fireEvent.click(screen.getByRole("button", { name: "Print kitchen sheet" }));

    expect(print).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("explains when the browser has no print function", () => {
    Object.defineProperty(window, "print", { configurable: true, value: undefined });
    render(<KitchenActions text={plainText} />);

    fireEvent.click(screen.getByRole("button", { name: "Print kitchen sheet" }));

    expect(screen.getByRole("alert")).toHaveTextContent("Printing isn't available");
  });
});
