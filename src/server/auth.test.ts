// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const getSession = vi.fn();
const requestHeaders = new Headers({ cookie: "better-auth.session_token=fake" });

vi.mock("better-auth", () => ({
  betterAuth: vi.fn(() => ({ api: { getSession }, handler: vi.fn() })),
}));
vi.mock("better-auth/adapters/drizzle", () => ({ drizzleAdapter: vi.fn(() => ({})) }));
vi.mock("better-auth/next-js", () => ({ nextCookies: vi.fn(() => ({ id: "next-cookies" })) }));
vi.mock("@/db/client", () => ({ getDb: vi.fn(async () => ({})) }));
vi.mock("next/headers", () => ({ headers: vi.fn(async () => requestHeaders) }));
vi.mock("next/navigation", () => ({
  redirect: vi.fn((to: string) => {
    throw new Error(`NEXT_REDIRECT:${to}`);
  }),
}));

import { redirect } from "next/navigation";
import { getHostOrNull, requireHost } from "./auth";

beforeEach(() => {
  getSession.mockReset();
  vi.mocked(redirect).mockClear();
});

describe("getHostOrNull", () => {
  it("returns null when there is no session", async () => {
    getSession.mockResolvedValue(null);
    await expect(getHostOrNull()).resolves.toBeNull();
  });

  it("looks the session up with the request headers", async () => {
    getSession.mockResolvedValue(null);
    await getHostOrNull();
    expect(getSession).toHaveBeenCalledWith({ headers: requestHeaders });
  });

  it("maps a session to { id, name, email } only", async () => {
    getSession.mockResolvedValue({
      session: { id: "s1", token: "secret-token", userId: "u1" },
      user: {
        id: "u1",
        name: "Will",
        email: "will@example.com",
        emailVerified: false,
        image: null,
      },
    });
    await expect(getHostOrNull()).resolves.toEqual({
      id: "u1",
      name: "Will",
      email: "will@example.com",
    });
  });
});

describe("requireHost", () => {
  it("redirects to /login when there is no session", async () => {
    getSession.mockResolvedValue(null);
    await expect(requireHost()).rejects.toThrow("NEXT_REDIRECT:/login");
    expect(redirect).toHaveBeenCalledWith("/login");
  });

  it("returns the host when signed in", async () => {
    getSession.mockResolvedValue({
      session: { id: "s1" },
      user: { id: "u1", name: "Will", email: "will@example.com" },
    });
    await expect(requireHost()).resolves.toEqual({
      id: "u1",
      name: "Will",
      email: "will@example.com",
    });
    expect(redirect).not.toHaveBeenCalled();
  });
});
