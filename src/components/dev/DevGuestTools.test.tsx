import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { INITIAL_DEV_FORM_STATE } from "@/lib/dev-form";
import { DevGuestTools, type DevFormAction } from "./DevGuestTools";

const ok: DevFormAction = async () => ({ error: null, message: "Added" });

function renderTools(add: DevFormAction = ok) {
  return render(
    <DevGuestTools
      addGuestAction={add}
      addSampleAction={ok}
      addCrowdAction={ok}
      clearAction={ok}
      links={[
        { id: "g1", name: "Alex Chen", status: "yes", url: "http://localhost:3000/e/abc/g/tok" },
      ]}
    />,
  );
}

describe("DevGuestTools", () => {
  it("shows the manual form, presets and guest links", () => {
    renderTools();
    expect(screen.getByRole("heading", { name: "Guest lab" })).toBeInTheDocument();
    expect(screen.getByLabelText("Name")).toBeInTheDocument();
    expect(screen.getByLabelText("Answer")).toHaveValue("yes");
    expect(screen.getByLabelText("Plus-ones")).toBeInTheDocument();
    expect(screen.getByLabelText("Food notes")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add guest" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "One of each" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add 10 guests" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Clear guests" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open" })).toHaveAttribute(
      "href",
      "http://localhost:3000/e/abc/g/tok",
    );
  });

  it("sends the typed guest to the action", async () => {
    const add = vi.fn<DevFormAction>().mockResolvedValue({ error: null, message: "Added Alex" });
    renderTools(add);

    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Alex Chen" } });
    fireEvent.change(screen.getByLabelText("Answer"), { target: { value: "maybe" } });
    fireEvent.change(screen.getByLabelText("Plus-ones"), { target: { value: "Sam, Riley" } });
    fireEvent.change(screen.getByLabelText("Food notes"), { target: { value: "No dairy" } });
    fireEvent.click(screen.getByLabelText("Attended"));
    fireEvent.click(screen.getByRole("button", { name: "Add guest" }));

    await waitFor(() => expect(add).toHaveBeenCalled());
    const form = add.mock.calls[0][1];
    expect(form.get("name")).toBe("Alex Chen");
    expect(form.get("status")).toBe("maybe");
    expect(form.get("plusOnes")).toBe("Sam, Riley");
    expect(form.get("foodNotes")).toBe("No dairy");
    expect(form.get("attended")).toBe("on");
    expect(await screen.findByRole("status")).toHaveTextContent("Added Alex");
  });

  it("shows an action error instead of a success message", async () => {
    const add = vi
      .fn<DevFormAction>()
      .mockResolvedValue({ error: "Enter a name", message: null });
    renderTools(add);
    fireEvent.click(screen.getByRole("button", { name: "Add guest" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Enter a name");
  });

  it("starts with no messages", () => {
    renderTools();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(INITIAL_DEV_FORM_STATE).toEqual({ error: null, message: null });
  });
});
