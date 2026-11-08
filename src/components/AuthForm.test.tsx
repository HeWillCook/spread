import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { push, refresh, signUpEmail, signInEmail } = vi.hoisted(() => ({
  push: vi.fn(),
  refresh: vi.fn(),
  signUpEmail: vi.fn(),
  signInEmail: vi.fn(),
}));

vi.mock("next/navigation", () => ({ useRouter: () => ({ push, refresh }) }));
vi.mock("@/lib/auth-client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/auth-client")>()),
  authClient: {
    signUp: { email: signUpEmail },
    signIn: { email: signInEmail },
  },
}));

import { AuthForm } from "./AuthForm";

beforeEach(() => {
  push.mockReset();
  refresh.mockReset();
  signUpEmail.mockReset();
  signInEmail.mockReset();
});

describe("AuthForm", () => {
  it.each(["login", "signup"] as const)(
    "%s form posts natively so credentials can never land in a URL",
    (mode) => {
      const { container } = render(<AuthForm mode={mode} />);
      const form = container.querySelector("form");
      expect(form?.getAttribute("method")?.toLowerCase()).toBe("post");
    },
  );

  it("renders the submit button disabled before hydration, enabled once mounted", () => {
    // Server render = what the browser shows before React hydrates.
    const html = renderToString(<AuthForm mode="login" />);
    expect(html).toMatch(/<button[^>]*\sdisabled(=""|\s|>)/);

    render(<AuthForm mode="login" />);
    expect(screen.getByRole("button", { name: "Log in" })).toBeEnabled();
  });

  it("logs in through the Better Auth client instead of navigating", async () => {
    signInEmail.mockResolvedValue({ error: null });
    render(<AuthForm mode="login" />);
    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "host@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "correct-horse" },
    });
    const notPrevented = fireEvent.submit(
      screen.getByRole("button", { name: "Log in" }).closest("form")!,
    );
    expect(notPrevented).toBe(false); // preventDefault() was called

    await waitFor(() => expect(push).toHaveBeenCalledWith("/host"));
    expect(signInEmail).toHaveBeenCalledWith({
      email: "host@example.com",
      password: "correct-horse",
    });
  });

  it("shows a friendly error when the client reports one", async () => {
    signInEmail.mockResolvedValue({
      error: { code: "INVALID_EMAIL_OR_PASSWORD", message: "Invalid email or password" },
    });
    render(<AuthForm mode="login" />);
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "a@b.co" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "wrongwrong" } });
    fireEvent.submit(screen.getByRole("button", { name: "Log in" }).closest("form")!);
    expect(await screen.findByRole("alert")).toHaveTextContent(/don't match/);
    expect(push).not.toHaveBeenCalled();
  });
});
