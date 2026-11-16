import type { ReactNode } from "react";
import { Embers } from "./Embers";
import { Flames, type FlameSize } from "./Flames";

/**
 * A coal band: a soft grate, a warm glow from the fire edge, a continuous fire
 * bed along that edge and embers drifting up the whole band. Content sits above
 * the fire layer. Inset bands get the 8px surface radius; full-bleed bands stay
 * square.
 */
export function GrillBand({
  children,
  edge = "bottom",
  inset = true,
  flames = true,
  emberCount = 20,
  emberRise = 180,
  flameSize = "md",
  className = "",
  contentClassName = "",
}: {
  children: ReactNode;
  edge?: "top" | "bottom";
  inset?: boolean;
  flames?: boolean;
  emberCount?: number;
  emberRise?: number;
  flameSize?: FlameSize;
  className?: string;
  contentClassName?: string;
}) {
  return (
    <div
      className={`grill-band ${inset ? "grill-band-inset" : ""} ${className}`}
      data-edge={edge}
    >
      {flames ? <Flames edge={edge} size={flameSize} /> : null}
      <Embers count={emberCount} rise={emberRise} />
      <div className={`grill-band-content ${contentClassName}`}>{children}</div>
    </div>
  );
}
