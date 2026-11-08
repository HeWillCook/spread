/** Name of the httpOnly cookie that remembers a guest's edit token for one event. */
export function guestCookieName(code: string): string {
  return `cookout_g_${code}`;
}

export const GUEST_COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year, in seconds
