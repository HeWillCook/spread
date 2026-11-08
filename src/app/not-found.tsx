import Link from "next/link";
import { Wordmark } from "@/components/ui/Wordmark";

export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-4 px-6 py-16 text-center">
      <Wordmark />
      <h1 className="text-2xl font-bold leading-tight text-ink">We can&apos;t find that page.</h1>
      <p className="text-base text-ink/80">
        If you were sent an RSVP link, ask your host for a fresh one.
      </p>
      <Link
        href="/"
        className="inline-flex min-h-12 items-center justify-center rounded-xl border-2 border-ink bg-mustard px-5 py-3 text-base font-bold text-ink transition-transform active:translate-y-px"
      >
        Back to Cookout
      </Link>
    </main>
  );
}
