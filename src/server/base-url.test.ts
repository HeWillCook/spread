// @vitest-environment node
import { describe, expect, it, vi } from "vitest";

vi.mock("next/headers", () => ({ headers: vi.fn(async () => new Headers()) }));

import { baseUrlFrom, shareUrl } from "./base-url";

describe("baseUrlFrom", () => {
  it("prefers the configured URL and drops a trailing slash", () => {
    expect(baseUrlFrom(new Headers({ host: "evil.test" }), "https://cookout.example/")).toBe(
      "https://cookout.example",
    );
  });

  it("builds the origin from forwarded headers", () => {
    const h = new Headers({ "x-forwarded-host": "cookout.example", "x-forwarded-proto": "https" });
    expect(baseUrlFrom(h)).toBe("https://cookout.example");
  });

  it("falls back to host, using http for localhost", () => {
    expect(baseUrlFrom(new Headers({ host: "localhost:3000" }))).toBe("http://localhost:3000");
  });

  it("uses https for other hosts when no protocol is forwarded", () => {
    expect(baseUrlFrom(new Headers({ host: "cookout.example" }))).toBe("https://cookout.example");
  });

  it("falls back to localhost when nothing is known", () => {
    expect(baseUrlFrom(new Headers())).toBe("http://localhost:3000");
  });
});

describe("shareUrl", () => {
  it("joins the base URL and the encoded share code", () => {
    expect(shareUrl("https://cookout.example", "abc-123")).toBe("https://cookout.example/e/abc-123");
  });
});
