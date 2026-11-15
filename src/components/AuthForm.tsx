"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useSyncExternalStore, type FormEvent } from "react";
import { authClient, friendlyAuthError } from "@/lib/auth-client";
import { Button } from "./ui/Button";
import { Field } from "./ui/Field";
import { Wordmark } from "./ui/Wordmark";

const COPY = {
  login: {
    title: "Welcome back",
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
    <main className="mx-auto flex w-full max-w-md flex-col gap-5 px-3 pb-14 pt-5 sm:pt-14">
      <Link href="/" aria-label="Spread home" className="wordmark-link self-start px-2">
        <Wordmark />
      </Link>

      <div className="ticket slip">
      <header className="slip-head">
        <h1 className="text-[2.25rem] leading-none">{copy.title}</h1>
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

      <p className="pt-2 text-center text-sm text-ink-muted">
        {copy.switchText}{" "}
        <Link href={copy.switchHref} className="font-bold text-ketchup underline">
          {copy.switchLink}
        </Link>
      </p>
    </main>
  );
}
