import { mkdir } from "node:fs/promises";
import path from "node:path";
import type { PgDatabase } from "drizzle-orm/pg-core";
import * as schema from "./schema";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Db = PgDatabase<any, typeof schema>;

const globalForDb = globalThis as unknown as { __cookoutDb?: Promise<Db> };

async function init(): Promise<Db> {
  const url = process.env.DATABASE_URL;
  if (url) {
    // Migrations are applied separately via `npm run db:migrate`.
    const { default: postgres } = await import("postgres");
    const { drizzle } = await import("drizzle-orm/postgres-js");
    return drizzle(postgres(url), { schema });
  }

  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const { migrate } = await import("drizzle-orm/pglite/migrator");
  const { seedStarterRecipes } = await import("./seed");
  const dataDir = path.join(process.cwd(), ".data", "pglite");
  await mkdir(dataDir, { recursive: true });
  const db = drizzle(new PGlite(dataDir), { schema });
  await migrate(db, { migrationsFolder: path.join(process.cwd(), "drizzle") });
  await seedStarterRecipes(db);
  return db;
}

/**
 * Singleton database handle (kept on globalThis so Next.js hot reload doesn't
 * reopen it). DATABASE_URL -> postgres-js; otherwise PGlite in .data/pglite.
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
