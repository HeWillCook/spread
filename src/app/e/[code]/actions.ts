"use server";

import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import type { RsvpFormState } from "@/components/RsvpForm";
import { getDb } from "@/db/client";
import type { RsvpStatus } from "@/domain/headcount";
import { GUEST_COOKIE_MAX_AGE, guestCookieName } from "@/lib/guest-cookie";
import { NotFoundError, ValidationError } from "@/services/errors";
import { submitRsvp, updateRsvp, type RsvpInput } from "@/services/rsvp";

const STATUSES: RsvpStatus[] = ["yes", "maybe", "no"];

function readInput(code: string, formData: FormData): RsvpInput {
  const status = formData.get("status");
  const text = (key: string) => {
    const v = formData.get(key);
    return typeof v === "string" ? v : "";
  };
  return {
    shareCode: code,
    name: text("name"),
    // Anything unrecognised becomes an invalid status for the service to reject.
    status: STATUSES.find((s) => s === status) ?? ("" as RsvpStatus),
    plusOneNames: formData.getAll("plusOne").filter((v): v is string => typeof v === "string"),
    foodNotes: text("foodNotes"),
  };
}

function guestPath(code: string, token: string): string {
  return `/e/${encodeURIComponent(code)}/g/${encodeURIComponent(token)}`;
}

/** First answer: saves the RSVP, remembers the guest in a cookie, shows their edit page. */
export async function submitGuestRsvp(
  code: string,
  _prev: RsvpFormState,
  formData: FormData,
): Promise<RsvpFormState> {
  let editToken: string;
  try {
    ({ editToken } = await submitRsvp(await getDb(), readInput(code, formData)));
  } catch (error) {
    if (error instanceof ValidationError) return { error: error.message };
    if (error instanceof NotFoundError) notFound();
    throw error;
  }
  (await cookies()).set(guestCookieName(code), editToken, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: GUEST_COOKIE_MAX_AGE,
    secure: process.env.NODE_ENV === "production",
  });
  redirect(guestPath(code, editToken));
}

/** Changes an existing answer via the guest's edit token. */
export async function updateGuestRsvp(
  code: string,
  token: string,
  _prev: RsvpFormState,
  formData: FormData,
): Promise<RsvpFormState> {
  try {
    await updateRsvp(await getDb(), { ...readInput(code, formData), editToken: token });
  } catch (error) {
    if (error instanceof ValidationError) return { error: error.message };
    if (error instanceof NotFoundError) notFound();
    throw error;
  }
  redirect(guestPath(code, token));
}
