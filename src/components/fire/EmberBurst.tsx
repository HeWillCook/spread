import type { CSSProperties } from "react";
import { between, round, seeded } from "./seed";

interface BurstSpec {
  x: number;
  size: number;
  dur: number;
  delay: number;
  drift: number;
  tone: string;
}

const BURST: readonly BurstSpec[] = (() => {
  const rand = seeded(0xb0057);
  const tones = ["var(--ember)", "var(--flame)", "var(--flame-tip)"];
  return Array.from({ length: 12 }, () => ({
    x: between(rand, 3, 97),
    size: between(rand, 2.5, 5.5),
    dur: between(rand, 1.2, 1.9),
    delay: between(rand, 0, 0.35),
    drift: between(rand, -40, 40),
    tone: tones[Math.floor(rand() * tones.length)],
  }));
})();

/**
 * A one-time ember pop for a success moment. CSS-only and `both`-filled, so it
 * runs once on mount and is gone; reduced motion hides it.
 */
export function EmberBurst({ className = "" }: { className?: string }) {
  return (
    <span aria-hidden="true" className={`ember-burst ${className}`}>
      {BURST.map((ember, index) => (
        <span
          key={index}
          className="ember-burst-dot"
          style={
            {
              "--x": `${round(ember.x, 1)}%`,
              "--size": `${round(ember.size, 1)}px`,
              "--dur": `${round(ember.dur, 2)}s`,
              "--delay": `${round(ember.delay, 2)}s`,
              "--drift": `${round(ember.drift, 1)}px`,
              "--ember-tone": ember.tone,
            } as CSSProperties
          }
        />
      ))}
    </span>
  );
}
