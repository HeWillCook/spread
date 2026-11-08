// Pure connection-setting decisions, kept apart from the drivers so they are easy to test.

type Env = Readonly<Record<string, string | undefined>>;

const POOL_MAX_LIMIT = 10;
// Outside production a few connections are plenty for one developer.
const DEV_POOL_MAX = 5;

/**
 * Options for the postgres-js client.
 *
 * - `max`: each serverless instance should hold as few connections as possible, so it
 *   defaults to 1 in production and on Vercel; set DATABASE_POOL_MAX (1-10) to change it.
 * - `prepare: false`: transaction poolers (Supabase on port 6543, Neon's pooled string)
 *   don't support prepared statements.
 */
export function postgresOptions(env: Env): { max: number; prepare: false } {
  const raw = env.DATABASE_POOL_MAX?.trim();
  if (raw) {
    const max = /^\d+$/.test(raw) ? Number(raw) : Number.NaN;
    if (!Number.isInteger(max) || max < 1 || max > POOL_MAX_LIMIT) {
      throw new Error(`DATABASE_POOL_MAX must be a whole number from 1 to ${POOL_MAX_LIMIT}`);
    }
    return { max, prepare: false };
  }
  const serverless = env.NODE_ENV === "production" || Boolean(env.VERCEL);
  return { max: serverless ? 1 : DEV_POOL_MAX, prepare: false };
}

/**
 * Which database to open. DATABASE_URL means Postgres. Without it the app uses embedded
 * PGlite, which writes to disk, so in production that is refused (a serverless
 * filesystem is read-only and not shared) unless PGLITE_DATA_DIR explicitly opts in.
 */
export function chooseDriver(env: Env): "postgres" | "pglite" {
  if (env.DATABASE_URL) return "postgres";
  if (env.NODE_ENV === "production" && !env.PGLITE_DATA_DIR) {
    throw new Error(
      "DATABASE_URL is required in production. Set it to your Postgres connection string.",
    );
  }
  return "pglite";
}
