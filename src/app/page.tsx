import { Wordmark } from "@/components/ui/Wordmark";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-3 px-6 py-16 text-center">
      <h1 className="text-5xl">
        <Wordmark className="text-5xl" />
      </h1>
      <p className="text-base font-bold">Party planning, minus the group chat.</p>
    </main>
  );
}
