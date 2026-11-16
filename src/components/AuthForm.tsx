"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useSyncExternalStore, type FormEvent } from "react";
import { authClient, friendlyAuthError } from "@/lib/auth-client";
import { Button } from "./ui/Button";
import { Field } from "./ui/Field";

const COPY = {
  login: {
    title: "Log in",
    blurb: "Log in to manage your events.",
    submit: "Log in",
    pending: "Logging in...",
    switchText: "New here?",
    switchLink: "Create an account",
    switchHref: "/signup",
  },
  signup: {
    title: "Host a get-together",
    blurb: "Make an account to plan the food and the guest list. Guests never need one.",
    submit: "Create account",
    pending: "Creating account...",
    switchText: "Already have an account?",
    switchLink: "Log in",
    switchHref: "/login",
  },
} as const;

const noopSubscribe = () => () => {};

/** false while server-rendering / before hydration, true once React is live. */
function useHydrated(): boolean {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const copy = COPY[mode];
  const hydrated = useHydrated();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const email = String(data.get("email") ?? "").trim();
    const password = String(data.get("password") ?? "");
    setError(null);
    setPending(true);
    try {
      const { error: authError } =
        mode === "signup"
          ? await authClient.signUp.email({
              name: String(data.get("name") ?? "").trim(),
              email,
              password,
            })
          : await authClient.signIn.email({ email, password });
      if (authError) {
        setError(friendlyAuthError(authError));
        return;
      }
      router.push("/host");
      router.refresh();
    } catch {
      setError("We couldn't reach the server. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="ticket slip">
        <header className="slip-head">
          <h2 className="text-[2.25rem] leading-none">{copy.title}</h2>
          <p className="text-sm text-ink-muted">{copy.blurb}</p>
        </header>
        <div className="slip-body">
          {/* method="post" + a disabled button until hydration: a native submit before
              React is live must never put credentials in the URL query string. */}
          <form method="post" onSubmit={onSubmit} className="flex flex-col gap-4">
            {mode === "signup" ? (
              <Field
                label="Your name"
                name="name"
                autoComplete="name"
                maxLength={80}
                required
              />
            ) : null}
            <Field
              label="Email"
              name="email"
              type="email"
              autoComplete="email"
              inputMode="email"
              required
            />
            <Field
              label="Password"
              name="password"
              type="password"
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              minLength={mode === "signup" ? 8 : undefined}
              hint={mode === "signup" ? "At least 8 characters." : undefined}
              required
            />

            {error ? (
              <p
                role="alert"
                className="rounded-xl bg-ketchup px-4 py-3 text-sm font-bold text-paper"
              >
                {error}
              </p>
            ) : null}

            <Button variant="red" type="submit" disabled={!hydrated || pending} className="text-lg">
              {pending ? copy.pending : copy.submit}
            </Button>
          </form>
        </div>
      </div>

      <p className="text-center text-sm text-ink-muted">
        {copy.switchText}{" "}
        <Link href={copy.switchHref} className="inline-flex min-h-11 items-center px-1 font-bold text-ketchup underline">
          {copy.switchLink}
        </Link>
      </p>
    </div>
  );
}
