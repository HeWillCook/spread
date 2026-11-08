import { describe, expect, it } from "vitest";
import { chooseDriver, postgresOptions } from "./config";

describe("postgresOptions", () => {
  it("never uses prepared statements, so transaction poolers (Supabase 6543, Neon pooled) work", () => {
    expect(postgresOptions({}).prepare).toBe(false);
    expect(postgresOptions({ NODE_ENV: "production" }).prepare).toBe(false);
  });

  it("defaults to a single connection in production and on Vercel", () => {
    expect(postgresOptions({ NODE_ENV: "production" }).max).toBe(1);
    expect(postgresOptions({ VERCEL: "1" }).max).toBe(1);
  });

  it("allows a few connections in development", () => {
    expect(postgresOptions({ NODE_ENV: "development" }).max).toBe(5);
    expect(postgresOptions({}).max).toBe(5);
  });

  it("DATABASE_POOL_MAX overrides the default with a whole number from 1 to 10", () => {
    expect(postgresOptions({ NODE_ENV: "production", DATABASE_POOL_MAX: "4" }).max).toBe(4);
    expect(postgresOptions({ DATABASE_POOL_MAX: " 10 " }).max).toBe(10);
    expect(postgresOptions({ DATABASE_POOL_MAX: "1" }).max).toBe(1);
  });

  it("treats an empty DATABASE_POOL_MAX as unset", () => {
    expect(postgresOptions({ NODE_ENV: "production", DATABASE_POOL_MAX: "" }).max).toBe(1);
  });

  it("rejects values outside 1-10 or that are not whole numbers", () => {
    for (const bad of ["0", "11", "-1", "2.5", "many", "1e1"]) {
      expect(() => postgresOptions({ DATABASE_POOL_MAX: bad })).toThrow(/DATABASE_POOL_MAX/);
    }
  });
});

describe("chooseDriver", () => {
  it("uses Postgres whenever DATABASE_URL is set", () => {
    expect(chooseDriver({ DATABASE_URL: "postgres://x", NODE_ENV: "production" })).toBe("postgres");
    expect(chooseDriver({ DATABASE_URL: "postgres://x" })).toBe("postgres");
  });

  it("falls back to embedded PGlite outside production", () => {
    expect(chooseDriver({})).toBe("pglite");
    expect(chooseDriver({ NODE_ENV: "development", DATABASE_URL: "" })).toBe("pglite");
    expect(chooseDriver({ NODE_ENV: "test" })).toBe("pglite");
  });

  it("refuses to fall back to PGlite in production without DATABASE_URL", () => {
    expect(() => chooseDriver({ NODE_ENV: "production" })).toThrow("DATABASE_URL is required in production");
    expect(() => chooseDriver({ NODE_ENV: "production", DATABASE_URL: "" })).toThrow(
      "DATABASE_URL is required in production",
    );
  });

  it("an explicit PGLITE_DATA_DIR is an opt-in to PGlite even in production", () => {
    expect(chooseDriver({ NODE_ENV: "production", PGLITE_DATA_DIR: ".data/e2e-pglite" })).toBe("pglite");
    expect(() => chooseDriver({ NODE_ENV: "production", PGLITE_DATA_DIR: "" })).toThrow(
      "DATABASE_URL is required in production",
    );
  });
});
