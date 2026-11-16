import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getDb } from "@/db/client";
import { account, session, user, verification } from "@/db/schema";

export interface Host {
  id: string;
  name: string;
  email: string;
}

// Only used outside production so local dev and tests work with zero setup.
const DEV_SECRET = "spread-dev-only-secret-do-not-use-in-production";

function authSecret(): string {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (secret) return secret;
  if (process.env.NODE_ENV !== "production") return DEV_SECRET;
  throw new Error(
    "BETTER_AUTH_SECRET is not set. Set it to a long random string (e.g. `openssl rand -base64 32`) in production.",
  );
}

async function createAuth() {
  return betterAuth({
    database: drizzleAdapter(await getDb(), {
      provider: "pg",
      schema: { user, session, account, verification },
    }),
    secret: authSecret(),
    // When unset, Better Auth derives the origin from the incoming request.
    baseURL: process.env.BETTER_AUTH_URL || undefined,
    emailAndPassword: { enabled: true },
    // Must be last: lets Better Auth set cookies from server actions.
    plugins: [nextCookies()],
  });
}

export type Auth = Awaited<ReturnType<typeof createAuth>>;

const globalForAuth = globalThis as unknown as { __spreadAuth?: Promise<Auth> };

/**
 * Singleton Better Auth instance. Created lazily because the database handle is
 * async and so the production secret check doesn't run at build time.
 */
export function getAuth(): Promise<Auth> {
  if (!globalForAuth.__spreadAuth) {
    const pending = createAuth();
    // Don't cache a failed init, so the next call can retry.
    pending.catch(() => {
      if (globalForAuth.__spreadAuth === pending) delete globalForAuth.__spreadAuth;
    });
    globalForAuth.__spreadAuth = pending;
  }
  return globalForAuth.__spreadAuth;
}

/** The signed-in host for this request, or null. Guests never have a session. */
export async function getHostOrNull(): Promise<Host | null> {
  const auth = await getAuth();
  const result = await auth.api.getSession({ headers: await headers() });
  if (!result) return null;
  const { id, name, email } = result.user;
  return { id, name, email };
}

/** The signed-in host, or a redirect to /login. */
export async function requireHost(): Promise<Host> {
  const host = await getHostOrNull();
  if (!host) redirect("/login");
  return host;
}
