import type { CSSProperties } from "react";

export type WashiPattern = "stripe" | "dots" | "gingham" | "plain";
export type WashiTone = "mustard" | "ketchup" | "pickle";

/**
 * A torn strip of washi tape for holding a ticket or label to the page. The
 * parent positions it; it is decorative, so it carries no accessible text.
 */
export function WashiTape({
  pattern = "stripe",
  tone = "mustard",
  tilt = -3,
  className = "",
}: {
  pattern?: WashiPattern;
  tone?: WashiTone;
  tilt?: number;
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={`washi washi-${tone} washi-${pattern} ${className}`}
      style={{ "--tape-tilt": `${tilt}deg` } as CSSProperties}
    />
  );
}
