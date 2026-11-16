import type { CSSProperties } from "react";
import { between, round, seeded } from "./seed";

interface EmberSpec {
  /** Horizontal position, percent of the band. */
  x: number;
  /** Dot diameter in pixels. */
  size: number;
  /** Rise duration and negative delay, seconds. */
  dur: number;
  delay: number;
  /** Horizontal travel by the top of the rise, pixels. */
  drift: number;
  tone: "ember" | "flame" | "tip";
}

/** A fixed table, wider than the default count, so a busy band never repeats a dot. */
const EMBERS: readonly EmberSpec[] = (() => {
  const rand = seeded(0xf1e5);
  return Array.from({ length: 60 }, () => {
    const pick = rand();
    return {
      x: between(rand, 1.5, 98.5),
      size: between(rand, 2.5, 6.5),
      dur: between(rand, 6, 11.5),
      delay: -between(rand, 0.2, 9),
      drift: between(rand, -32, 32),
      tone: pick > 0.78 ? "tip" : pick > 0.45 ? "flame" : "ember",
    };
  });
})();

const TONE: Record<EmberSpec["tone"], string> = {
  ember: "var(--ember)",
  flame: "var(--flame)",
  tip: "var(--flame-tip)",
};

/**
 * A layer of glowing dots rising through a coal band. Absolutely positioned
 * over its container: the parent needs `position: relative`. `rise` is how far
 * they travel before fading. Purely decorative and CSS-animated; reduced
 * motion hides it entirely.
 */
export function Embers({
  count = 18,
  rise = 180,
  className = "",
}: {
  count?: number;
  rise?: number;
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={`embers ${className}`}
      style={{ "--rise": `${rise}px` } as CSSProperties}
    >
      {EMBERS.slice(0, count).map((ember, index) => (
        <span
          key={index}
          className="ember"
          data-tone={ember.tone}
          style={
            {
              "--x": `${round(ember.x, 1)}%`,
              "--size": `${round(ember.size, 1)}px`,
              "--dur": `${round(ember.dur, 2)}s`,
              "--delay": `${round(ember.delay, 2)}s`,
              "--drift": `${round(ember.drift, 1)}px`,
              "--ember-tone": TONE[ember.tone],
            } as CSSProperties
          }
        />
      ))}
    </span>
  );
}
