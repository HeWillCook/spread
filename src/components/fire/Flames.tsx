import type { CSSProperties } from "react";
import { between, round, seeded } from "./seed";

export type FlameSize = "sm" | "md" | "lg";

/** The tallest tongue in the row: masthead strip, band, big landing close. */
const HEIGHTS: Record<FlameSize, number> = { sm: 28, md: 62, lg: 112 };

/** Densities per size, enough that neighbouring tongues always overlap. */
const COUNTS: Record<FlameSize, { back: number; front: number }> = {
  sm: { back: 44, front: 36 },
  md: { back: 36, front: 30 },
  lg: { back: 34, front: 28 },
};

const OUTER =
  "M16 64C7.4 64 1.6 57.6 1.6 49.4C1.6 42.8 4.9 37.6 8.6 32.4C12.3 27.1 13.6 20.3 12.6 13.2C17.2 17.1 20.4 23.9 21 30.6C22 28.4 22.7 25.3 22.9 22C27.5 27.8 30.4 34.4 30.4 42.6C30.4 55.4 24.2 64 16 64Z";
const INNER =
  "M16 64C10.4 64 6.2 59.6 6.2 54C6.2 49.2 8.8 45.6 11.4 42C14 38.4 14.9 33.4 14.3 28.4C17.8 31.5 20 36 20.4 40.3C21.2 38.7 21.7 36.6 21.9 34.4C24.8 38.3 26.8 42.8 26.8 48C26.8 57 22 64 16 64Z";

interface TongueSpec {
  x: number;
  width: number;
  height: number;
  dur: number;
  delay: number;
  skew: number;
}

function row(size: FlameSize, depth: "back" | "front"): TongueSpec[] {
  const tallest = HEIGHTS[size];
  const count = COUNTS[size][depth];
  const rand = seeded((size === "sm" ? 0x51a7 : size === "md" ? 0x51b9 : 0x51cb) + (depth === "back" ? 11 : 29));
  return Array.from({ length: count }, (_, index) => {
    const scale = depth === "back" ? between(rand, 0.55, 1) : between(rand, 0.26, 0.6);
    const height = tallest * scale;
    const widthFactor =
      size === "sm"
        ? depth === "back"
          ? between(rand, 0.9, 1.3)
          : between(rand, 0.75, 1.05)
        : depth === "back"
          ? between(rand, 0.45, 0.75)
          : between(rand, 0.38, 0.65);
    const width = height * widthFactor;
    return {
      x: Math.min(99, Math.max(1, ((index + 0.5) / count) * 100 + between(rand, -1.2, 1.2))),
      width,
      height,
      dur: between(rand, 1.1, 1.9),
      delay: -between(rand, 0, 1.9),
      skew: between(rand, -2.6, 2.6),
    };
  });
}

function Tongue({ tongue, depth }: { tongue: TongueSpec; depth: "back" | "front" }) {
  return (
    <span
      className="flame-tongue"
      data-depth={depth}
      style={
        {
          left: `calc(${round(tongue.x, 2)}% - ${round(tongue.width / 2, 2)}px)`,
          "--w": `${round(tongue.width, 2)}px`,
          "--h": `${round(tongue.height, 2)}px`,
          "--dur": `${round(tongue.dur, 2)}s`,
          "--delay": `${round(tongue.delay, 2)}s`,
          "--skew": `${round(tongue.skew, 1)}deg`,
        } as CSSProperties
      }
    >
      <svg viewBox="0 0 32 64" preserveAspectRatio="none" focusable="false">
        <path
          d={OUTER}
          fill={depth === "back" ? "var(--ember)" : "var(--flame)"}
          opacity={depth === "back" ? "0.5" : "0.98"}
        />
        <path
          d={INNER}
          fill={depth === "back" ? "var(--ketchup-deep)" : "var(--flame-tip)"}
          opacity={depth === "back" ? "0.62" : "0.95"}
        />
      </svg>
    </span>
  );
}

/**
 * A continuous fire bed: two overlapping rows of flame tongues over a glowing
 * coal strip, with a radial heat glow rising into the band. The parent needs
 * `position: relative`; the bed paints above its background and is decorative.
 * `edge` is the edge the fire is anchored to; flames always rise, so a `top`
 * bed flickers above the container.
 */
export function Flames({
  edge = "bottom",
  size = "md",
  className = "",
}: {
  edge?: "top" | "bottom";
  size?: FlameSize;
  className?: string;
}) {
  const back = row(size, "back");
  const front = row(size, "front");

  return (
    <span
      aria-hidden="true"
      data-edge={edge}
      data-size={size}
      className={`flames ${className}`}
      style={{ "--flame-h": `${HEIGHTS[size]}px` } as CSSProperties}
    >
      <span className="flame-glow" />
      <span className="flame-row">
        {back.map((tongue, index) => (
          <Tongue key={`back-${index}`} tongue={tongue} depth="back" />
        ))}
      </span>
      <span className="flame-row">
        {front.map((tongue, index) => (
          <Tongue key={`front-${index}`} tongue={tongue} depth="front" />
        ))}
      </span>
      <span className="flame-bed" />
    </span>
  );
}
