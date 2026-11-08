import { mkdir } from "node:fs/promises";
import path from "node:path";
import type { PgDatabase } from "drizzle-orm/pg-core";
import { chooseDriver, postgresOptions } from "./config";
import { seedStarterRecipes } from "./seed";
import * as schema from "./schema";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Db = PgDatabase<any, typeof schema>;

const globalForDb = globalThis as unknown as { __cookoutDb?: Promise<Db> };

function isMissingTable(error: unknown): boolean {
  for (let e = error as { code?: string; cause?: unknown } | undefined; e; ) {
    if (e.code === "42P01") return true; // Postgres undefined_table
    e = e.cause as typeof e;
  }
  return false;
}

/**
 * Seeds starter recipes into an already-migrated database (idempotent).
 * Throws an actionable error if the tables don't exist yet.
 */
export async function seedAfterConnect(db: Db): Promise<void> {
  try {
    await seedStarterRecipes(db);
  } catch (error) {
    if (isMissingTable(error)) {
      throw new Error(
        "Database tables are missing. Run `npm run db:migrate` before starting the app.",
        { cause: error },
      );
    }
    throw error;
  }
}

async function init(): Promise<Db> {
  // Throws in production when there is no DATABASE_URL (and no explicit PGLITE_DATA_DIR).
  const driver = chooseDriver(process.env);
  const url = process.env.DATABASE_URL;
  if (driver === "postgres" && url) {
    const { default: postgres } = await import("postgres");
    const { drizzle } = await import("drizzle-orm/postgres-js");
    const client = postgres(url, postgresOptions(process.env));
    const db = drizzle(client, { schema });
    // Migrations are NOT run here (`npm run db:migrate` does that), so the
    // tables must already exist before we can seed the starter recipes.
    try {
      await seedAfterConnect(db);
    } catch (error) {
      await client.end({ timeout: 1 }).catch(() => {});
      throw error;
    }
    return db;
  }

  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const { migrate } = await import("drizzle-orm/pglite/migrator");
  // PGLITE_DATA_DIR lets the e2e run use a throwaway database (see playwright.config.ts).
  const dataDir = process.env.PGLITE_DATA_DIR
    ? path.resolve(process.env.PGLITE_DATA_DIR)
    : path.join(process.cwd(), ".data", "pglite");
  await mkdir(dataDir, { recursive: true });
  const db = drizzle(new PGlite(dataDir), { schema });
  await migrate(db, { migrationsFolder: path.join(process.cwd(), "drizzle") });
  await seedAfterConnect(db);
  return db;
}

/**
 * Singleton database handle (kept on globalThis so Next.js hot reload doesn't
 * reopen it). DATABASE_URL -> postgres-js; otherwise PGlite in PGLITE_DATA_DIR (default
 * .data/pglite). In production DATABASE_URL is required unless PGLITE_DATA_DIR is set.
 */
export function getDb(): Promise<Db> {
  if (!globalForDb.__cookoutDb) {
    const pending = init();
    // Don't cache a failed init, so the next call can retry.
    pending.catch(() => {
      if (globalForDb.__cookoutDb === pending) delete globalForDb.__cookoutDb;
    });
    globalForDb.__cookoutDb = pending;
  }
  return globalForDb.__cookoutDb;
}
