import { Card } from "./ui/Card";

/** Temporary body for event tabs that later tasks fill in. */
export function ComingSoon({ what }: { what: string }) {
  return (
    <Card>
      <h2 className="text-lg font-bold text-ink">{what}</h2>
      <p className="text-sm text-ink/80">Coming soon.</p>
    </Card>
  );
}
