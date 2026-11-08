import { requireHost } from "@/server/auth";

// Placeholder so the post-login redirect has a target; the real dashboard replaces it.
export const dynamic = "force-dynamic";

export default async function HostPage() {
  const host = await requireHost();
  return (
    <main className="mx-auto w-full max-w-md p-5">
      <h1 className="text-3xl font-bold text-ink">Hi, {host.name}</h1>
    </main>
  );
}
