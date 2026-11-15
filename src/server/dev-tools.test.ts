import { afterEach, describe, expect, it, vi } from "vitest";
import { devToolsEnabled } from "./dev-tools";

afterEach(() => vi.unstubAllEnvs());

describe("devToolsEnabled", () => {
  it("is on for next dev only", () => {
    vi.stubEnv("NODE_ENV", "development");
    expect(devToolsEnabled()).toBe(true);
    vi.stubEnv("NODE_ENV", "production");
    expect(devToolsEnabled()).toBe(false);
    vi.stubEnv("NODE_ENV", "test");
    expect(devToolsEnabled()).toBe(false);
  });
});
