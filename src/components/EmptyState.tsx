import type { CSSProperties, ReactNode } from "react";
import { Sticker } from "./scrapbook/Sticker";
import { WashiTape } from "./scrapbook/WashiTape";

export type EmptyStateArt =
  | "guests"
  | "menu"
  | "shopping"
  | "split"
  | "today"
  | "dashboard";

function Stickers({ art }: { art: EmptyStateArt }) {
  switch (art) {
    case "guests":
      return (
        <>
          <Sticker name="ticket" size="lg" tilt={-6} />
          <Sticker name="balloon" size="md" tilt={9} className="empty-sticker-lift" />
        </>
      );
    case "menu":
      return <Sticker name="basket" size="lg" tilt={-4} />;
    case "shopping":
      return <Sticker name="bag" size="lg" tilt={4} />;
    case "split":
      return <Sticker name="glasses" size="lg" tilt={-3} />;
    case "today":
      return (
        <>
          <Sticker name="sun" size="lg" tilt={-7} />
          <Sticker name="star" size="md" tilt={10} className="empty-sticker-lift" />
        </>
      );
    case "dashboard":
      return (
        <div className="flex flex-col items-center">
          <Sticker name="basket" size="lg" tilt={-4} />
          <span className="empty-ants">
            {[0, 1, 2].map((index) => (
              <span
                key={index}
                className="empty-ant"
                style={{ "--ant-delay": `${index * 0.35}s` } as CSSProperties}
              >
                <Sticker name="ant" size="sm" tilt={0} />
              </span>
            ))}
          </span>
        </div>
      );
    default:
      return null;
  }
}

/**
 * A paper resting place for an empty list or a finished one. The art is a
 * small sticker composition; the card keeps the scrapbook's washi tape.
 */
export function EmptyState({
  title,
  children,
  action,
  art = "menu",
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
      <WashiTape
        pattern="stripe"
        tone="mustard"
        tilt={-2}
        className="empty-state-tape"
      />
      <span className="empty-state-stickers" aria-hidden="true">
        <Stickers art={art} />
      </span>
      <div className="empty-state-copy">
        <h3 className="empty-state-title">{title}</h3>
        {children ? <div className="empty-state-body">{children}</div> : null}
        {action ? <div className="empty-state-action">{action}</div> : null}
      </div>
    </div>
  );
}
