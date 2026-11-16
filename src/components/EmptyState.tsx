import type { ReactNode } from "react";
import { FlameIcon } from "./fire/FlameIcon";
import { GrillMarks } from "./fire/GrillMarks";

export type EmptyStateArt = "grill" | "ticket" | "cart" | "split" | "calendar";

const stroke = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2.2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

function Grate() {
  return (
    <div className="empty-art-grill">
      <svg viewBox="0 0 140 104" aria-hidden="true" focusable="false">
        <g {...stroke}>
          <path d="M20 38h100l-7 34H27Z" />
          <path d="M22 38h96" />
          <path d="M33 38v34M51 38v34M69 38v34M87 38v34M105 38v34" />
          <path d="M31 72 24 96M109 72l7 24" />
          <path d="M36 96h16M88 96h16" />
          <path d="M58 30c0-6 4-8 3-14 5 3 6 7 5 11 2-1 3-3 3-5 2 4 3 7 2 10" stroke="var(--ember)" />
        </g>
        <circle cx="69" cy="53" r="4" fill="var(--ember)" opacity="0.85" />
      </svg>
      <span className="empty-art-flame">
        <FlameIcon size="md" />
      </span>
    </div>
  );
}

function Ticket() {
  return (
    <svg viewBox="0 0 140 104" aria-hidden="true" focusable="false">
      <g {...stroke}>
        <path d="M30 24h80v20a7 7 0 0 0 0 14v22H30V58a7 7 0 0 0 0-14Z" />
        <path d="M46 40h34M46 50h20" />
        <path d="M95 24v56" strokeDasharray="4 5" />
        <path d="M30 72l8 8 8-8 8 8 8-8 8 8 8-8 8 8 8-8 8 8 8-8 8 8 8-8" />
      </g>
      <circle cx="111" cy="20" r="3.5" fill="var(--ember)" />
    </svg>
  );
}

function Cart() {
  return (
    <svg viewBox="0 0 140 104" aria-hidden="true" focusable="false">
      <g {...stroke}>
        <path d="M42 36h56l6 48H36Z" />
        <path d="M54 36V28a16 16 0 0 1 32 0v8" />
        <path d="M52 54h36M52 66h22" />
      </g>
      <circle cx="98" cy="52" r="3.5" fill="var(--ember)" />
    </svg>
  );
}

function Split() {
  return (
    <svg viewBox="0 0 140 104" aria-hidden="true" focusable="false">
      <g {...stroke}>
        <path d="M46 18h48v64l-6-5-6 5-6-5-6 5-6-5-6 5-6-5-6 5Z" />
        <path d="M58 32h24M58 43h16M58 54h20" />
        <path d="M84 68a14 14 0 1 0 0-28" stroke="var(--ember)" />
        <path d="M84 54v6l4 3" stroke="var(--ember)" />
      </g>
      <circle cx="84" cy="54" r="2.5" fill="var(--ember)" />
    </svg>
  );
}

function Calendar() {
  return (
    <svg viewBox="0 0 140 104" aria-hidden="true" focusable="false">
      <g {...stroke}>
        <rect x="32" y="26" width="76" height="64" rx="4" />
        <path d="M32 42h76M48 26v12M92 26v12" />
        <path d="M46 54h8M66 54h8M86 54h8M46 67h8M66 67h8M86 67h8" />
      </g>
      <rect x="64" y="52" width="12" height="12" rx="2" fill="var(--ember)" opacity="0.9" />
    </svg>
  );
}

function Art({ art }: { art: EmptyStateArt }) {
  switch (art) {
    case "grill":
      return <Grate />;
    case "cart":
      return <Cart />;
    case "split":
      return <Split />;
    case "calendar":
      return <Calendar />;
    default:
      return <Ticket />;
  }
}

/**
 * A paper resting place for an empty list or a finished one. The art is line
 * work with an ember accent; fire stays decorative and never prints. Pass
 * `inset` when the state already sits inside a Card.
 */
export function EmptyState({
  title,
  children,
  action,
  art = "grill",
  size = "md",
  inset = false,
  className = "",
}: {
  title: string;
  children?: ReactNode;
  action?: ReactNode;
  art?: EmptyStateArt;
  size?: "sm" | "md";
  inset?: boolean;
  className?: string;
}) {
  return (
    <div
      className={`empty-state ${size === "sm" ? "empty-state-sm" : ""} ${
        inset ? "empty-state-inset" : ""
      } ${className}`}
    >
      <GrillMarks className="empty-state-marks" />
      <span className="empty-state-art" aria-hidden="true">
        <Art art={art} />
      </span>
      <div className="empty-state-copy">
        <h3 className="empty-state-title">{title}</h3>
        {children ? <div className="empty-state-body">{children}</div> : null}
        {action ? <div className="empty-state-action">{action}</div> : null}
      </div>
    </div>
  );
}
