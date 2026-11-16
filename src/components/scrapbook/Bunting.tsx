import type { CSSProperties } from "react";
import { between, round, seeded } from "./seed";

const FLAG_COLOURS = [
  "var(--ketchup)",
  "var(--mustard)",
  "var(--pickle)",
  "var(--cream-deep)",
  "var(--mustard-deep)",
];

/** A gently sagging string; flags hang from points along it. */
function sagAt(t: number): number {
  return 8 + 24 * 4 * t * (1 - t);
}

function PicadoFlag({ colour }: { colour: string }) {
  return (
    <svg viewBox="0 0 40 34" className="bunting-flag-svg" focusable="false" aria-hidden="true">
      <path
        d="M2 2h36v22c-6 4-12-2-18 2S8 22 2 24Z"
        fill={colour}
      />
      <circle cx="20" cy="13" r="4" fill="var(--paper)" />
      <path d="M12 2v10M28 2v10" stroke="var(--paper)" strokeWidth="1.5" opacity=".7" />
    </svg>
  );
}

function TriangleFlag({ colour }: { colour: string }) {
  return (
    <svg viewBox="0 0 40 34" className="bunting-flag-svg" focusable="false" aria-hidden="true">
      <path d="M4 2h32l-16 30Z" fill={colour} />
      <path d="M10 2l10 19 10-19" fill="none" stroke="var(--paper)" strokeWidth="1.5" opacity=".4" />
    </svg>
  );
}

/**
 * A paper garland across its container. `picado` swaps the triangles for
 * cut-paper rectangles for the fiesta theme. Flags sway around their tops.
 */
export function Bunting({
  count = 9,
  variant = "flags",
  className = "",
}: {
  count?: number;
  variant?: "flags" | "picado";
  className?: string;
}) {
  const rand = seeded(0xb0017 + count + (variant === "picado" ? 17 : 3));
  const flags = Array.from({ length: count }, (_, index) => {
    const t = (index + 0.5) / count;
    return {
      t,
      x: t * 100,
      top: sagAt(t),
      colour: FLAG_COLOURS[index % FLAG_COLOURS.length],
      dur: between(rand, 3, 5),
      delay: -between(rand, 0, 4),
      tilt: between(rand, -2, 2),
    };
  });

  return (
    <span aria-hidden="true" className={`bunting bunting-${variant} ${className}`}>
      <svg
        className="bunting-string"
        viewBox="0 0 100 36"
        preserveAspectRatio="none"
        focusable="false"
        aria-hidden="true"
      >
        <path
          d="M0 8Q50 32 100 8"
          fill="none"
          stroke="var(--ink)"
          strokeWidth="1.6"
          opacity=".45"
        />
      </svg>
      {flags.map((flag, index) => (
        <span
          key={index}
          className={`bunting-flag ${variant === "picado" ? "bunting-flag-picado" : ""}`}
          style={
            {
              left: `${round(flag.x, 2)}%`,
              top: `${round(flag.top, 2)}px`,
              "--sway-dur": `${round(flag.dur, 2)}s`,
              "--sway-delay": `${round(flag.delay, 2)}s`,
              "--sway-tilt": `${round(flag.tilt, 1)}deg`,
            } as CSSProperties
          }
        >
          {variant === "picado" ? (
            <PicadoFlag colour={flag.colour} />
          ) : (
            <TriangleFlag colour={flag.colour} />
          )}
        </span>
      ))}
    </span>
  );
}
