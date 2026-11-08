"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";

/** Ends the host session, then sends them to the login page. */
export function SignOutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function signOut() {
    setError(null);
    setPending(true);
    try {
      const { error: authError } = await authClient.signOut();
      if (authError) {
        setError("We couldn't sign you out. Please try again.");
        return;
      }
      router.push("/login");
      router.refresh();
    } catch {
      setError("We couldn't sign you out. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={signOut}
        disabled={pending}
        className="min-h-10 text-sm font-bold text-ketchup underline disabled:opacity-50"
      >
        {pending ? "Signing out..." : "Sign out"}
      </button>
      {error ? (
        <p role="alert" className="text-xs font-bold text-ketchup">
          {error}
        </p>
      ) : null}
    </div>
  );
}
