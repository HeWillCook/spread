import { createAuthClient } from "better-auth/react";

// No baseURL: the browser client talks to the same origin's /api/auth.
export const authClient = createAuthClient();

/** Friendly copy for the errors a host can realistically hit. */
export function friendlyAuthError(error: { code?: string; message?: string }): string {
  switch (error.code) {
    case "INVALID_EMAIL_OR_PASSWORD":
      return "That email and password don't match. Give it another try.";
    case "USER_ALREADY_EXISTS":
    case "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL":
      return "There's already an account with that email. Try logging in instead.";
    case "INVALID_EMAIL":
      return "That email address doesn't look right.";
    case "PASSWORD_TOO_SHORT":
      return "Pick a password with at least 8 characters.";
    case "PASSWORD_TOO_LONG":
      return "That password is too long. Try a shorter one.";
    default:
      return "Something went wrong. Please try again.";
  }
}
