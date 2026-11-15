import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;
const ORIGIN = `http://localhost:${PORT}`;
// A throwaway PGlite database (inside the git-ignored .data/), deleted before every
// run so the test is repeatable and never touches the .data/pglite dev database.
const DATA_DIR = ".data/e2e-pglite";

export default defineConfig({
  testDir: "./e2e",
  // The tests share one server and database, and the main flow is a single story.
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  reporter: "list",
  use: {
    baseURL: ORIGIN,
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "mobile",
      // Phone-first app: 390x844 (iPhone 14) viewport, Chromium.
      use: { ...devices["Desktop Chrome"], viewport: { width: 390, height: 844 }, hasTouch: true },
    },
  ],
  webServer: {
    // Wipe the database, then run the production build exactly as it would be deployed.
    command: `node -e "require('node:fs').rmSync('${DATA_DIR}',{recursive:true,force:true})" && npm run build && npm run start -- --port ${PORT}`,
    url: ORIGIN,
    reuseExistingServer: false,
    timeout: 300_000,
    stdout: "ignore",
    stderr: "pipe",
    env: {
      PGLITE_DATA_DIR: DATA_DIR,
      // Embedded PGlite by default, even if DATABASE_URL is set in the shell. Set
      // E2E_DATABASE_URL to run the suite against a real (throwaway!) Postgres instead.
      DATABASE_URL: process.env.E2E_DATABASE_URL ?? "",
      BETTER_AUTH_SECRET: "e2e-only-secret-not-for-production-use",
      BETTER_AUTH_URL: ORIGIN,
    },
  },
});
