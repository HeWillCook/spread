import { headers } from "next/headers";

/**
 * The public origin of the app. A configured BETTER_AUTH_URL wins; otherwise it
 * is derived from the request's forwarded/host headers.
 */
export function baseUrlFrom(requestHeaders: Headers, configured?: string): string {
  if (configured) return configured.replace(/\/+$/, "");
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  if (!host) return "http://localhost:3000";
  const forwardedProto = requestHeaders.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const local = /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(host);
  const proto = forwardedProto || (local ? "http" : "https");
  return `${proto}://${host}`;
}

export async function getBaseUrl(): Promise<string> {
  return baseUrlFrom(await headers(), process.env.BETTER_AUTH_URL);
}

/** The full guest link for an event. */
export function shareUrl(baseUrl: string, shareCode: string): string {
  return `${baseUrl}/e/${encodeURIComponent(shareCode)}`;
}
