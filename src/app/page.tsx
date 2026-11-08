import Link from "next/link";
import { Wordmark } from "@/components/ui/Wordmark";
import { getHostOrNull } from "@/server/auth";

// Reads the session from request headers, so it must never be prerendered.
export const dynamic = "force-dynamic";

const linkBase =
  "inline-flex min-h-12 items-center justify-center rounded-xl border-2 border-ink px-5 py-3 text-lg font-bold text-ink transition-transform active:translate-y-px";

export default async function Home() {
  const host = await getHostOrNull();
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-5 px-6 py-16 text-center">
      <h1 className="text-5xl">
        <Wordmark className="text-5xl" />
      </h1>
      <p className="text-base font-bold">Party planning, minus the group chat.</p>
      <p className="text-sm text-ink/80">
        Share one link, see who&apos;s coming, and work out the food and the split.
      </p>
      <div className="flex w-full flex-col gap-3">
        {host ? (
          <Link href="/host" className={`${linkBase} bg-mustard`}>
            Go to your events
          </Link>
        ) : (
          <>
            <Link href="/signup" className={`${linkBase} bg-mustard`}>
              Host a cookout
            </Link>
            <Link href="/login" className={`${linkBase} bg-white`}>
              Log in
            </Link>
          </>
        )}
      </div>
    </main>
  );
}
