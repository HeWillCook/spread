import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { push, refresh, signOut } = vi.hoisted(() => ({
  push: vi.fn(),
  refresh: vi.fn(),
  signOut: vi.fn(),
}));

vi.mock("next/navigation", () => ({ useRouter: () => ({ push, refresh }) }));
vi.mock("@/lib/auth-client", () => ({ authClient: { signOut } }));

import { SignOutButton } from "./SignOutButton";

beforeEach(() => {
  push.mockReset();
  refresh.mockReset();
  signOut.mockReset();
});

describe("SignOutButton", () => {
  it("signs out through the Better Auth client, then goes to /login", async () => {
    signOut.mockResolvedValue({ data: { success: true }, error: null });
    render(<SignOutButton />);
    fireEvent.click(screen.getByRole("button", { name: "Sign out" }));

    await waitFor(() => expect(push).toHaveBeenCalledWith("/login"));
    expect(signOut).toHaveBeenCalledTimes(1);
    expect(signOut.mock.invocationCallOrder[0]).toBeLessThan(push.mock.invocationCallOrder[0]);
    expect(refresh).toHaveBeenCalled();
  });

  it("stays put and says so when signing out fails", async () => {
    signOut.mockResolvedValue({ data: null, error: { message: "boom" } });
    render(<SignOutButton />);
    fireEvent.click(screen.getByRole("button", { name: "Sign out" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/couldn't sign you out/i);
    expect(push).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Sign out" })).toBeEnabled();
  });

  it("stays put when the request throws", async () => {
    signOut.mockRejectedValue(new Error("offline"));
    render(<SignOutButton />);
    fireEvent.click(screen.getByRole("button", { name: "Sign out" }));
    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });
});
