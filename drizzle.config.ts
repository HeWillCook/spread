import { loadEnvConfig } from "@next/env";
import { defineConfig } from "drizzle-kit";

// drizzle-kit doesn't read Next's env files itself; load .env.local / .env the same way
// `next dev` does (variables already set in the shell win).
loadEnvConfig(process.cwd(), false, { info: () => {}, error: console.error });

// Migrations need a direct connection: Neon's pooled DATABASE_URL goes through PgBouncer in
// transaction mode, which breaks session state. `neon env pull` writes the direct string as
// DATABASE_URL_UNPOOLED; other hosts can just set DATABASE_URL.
const url = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url: url ?? "postgres://localhost:5432/cookout",
  },
});
