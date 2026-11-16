import type { CSSProperties, ReactNode } from "react";

export type StickerName =
  | "watermelon"
  | "sun"
  | "balloon"
  | "lantern"
  | "cake"
  | "burger"
  | "pizza"
  | "taco"
  | "glasses"
  | "pumpkin"
  | "tree"
  | "basket"
  | "mug"
  | "dice"
  | "butterfly"
  | "ant"
  | "leaf"
  | "snowflake"
  | "star"
  | "heart"
  | "ticket"
  | "bag"
  | "popper"
  | "grill"
  | "plate";

/** The thick white die-cut edge behind every filled silhouette. */
function Die({ children }: { children: ReactNode }) {
  return (
    <g
      stroke="var(--paper)"
      strokeWidth="6"
      strokeLinejoin="round"
      strokeLinecap="round"
      paintOrder="stroke"
    >
      {children}
    </g>
  );
}

const DESIGNS: Record<StickerName, ReactNode> = {
  watermelon: (
    <>
      <Die>
        <path d="M8 44A24 24 0 0 1 56 44Z" fill="var(--pickle)" />
      </Die>
      <path d="M13 44A19 19 0 0 1 51 44Z" fill="var(--cream)" />
      <path d="M18 44A14 14 0 0 1 46 44Z" fill="var(--ketchup)" />
      <g fill="var(--ink)">
        <ellipse cx="26" cy="38" rx="1.4" ry="2.1" transform="rotate(-24 26 38)" />
        <ellipse cx="32" cy="35" rx="1.4" ry="2.1" transform="rotate(6 32 35)" />
        <ellipse cx="38" cy="38" rx="1.4" ry="2.1" transform="rotate(24 38 38)" />
      </g>
    </>
  ),
  sun: (
    <>
      <Die>
        <circle cx="32" cy="32" r="13" fill="var(--mustard)" />
        {[
          [32, 8],
          [32, 56],
          [8, 32],
          [56, 32],
          [15, 15],
          [49, 15],
          [15, 49],
          [49, 49],
        ].map(([cx, cy]) => (
          <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="4.4" fill="var(--mustard)" />
        ))}
      </Die>
      <circle cx="27" cy="30" r="1.8" fill="var(--ink)" />
      <circle cx="37" cy="30" r="1.8" fill="var(--ink)" />
      <path
        d="M26 36c2 3 10 3 12 0"
        stroke="var(--ink)"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      />
      <circle cx="22" cy="35" r="2.2" fill="var(--ketchup)" opacity=".5" />
      <circle cx="42" cy="35" r="2.2" fill="var(--ketchup)" opacity=".5" />
    </>
  ),
  balloon: (
    <>
      <Die>
        <path
          d="M32 6c-11 0-18 8-18 18 0 11 10 17 18 22 8-5 18-11 18-22 0-10-7-18-18-18Z"
          fill="var(--ketchup)"
        />
        <path d="M28 46h8l-4 5Z" fill="var(--ketchup-deep)" />
      </Die>
      <path
        d="M32 51c3 4-2 6 1 10"
        stroke="var(--ink)"
        strokeWidth="1.8"
        strokeLinecap="round"
        fill="none"
      />
      <ellipse
        cx="24"
        cy="20"
        rx="4"
        ry="6"
        fill="var(--paper)"
        opacity=".4"
        transform="rotate(-20 24 20)"
      />
    </>
  ),
  lantern: (
    <>
      <Die>
        <path
          d="M25 18h14v6c8 4 8 20 0 24v6H25v-6c-8-4-8-20 0-24Z"
          fill="var(--mustard)"
        />
        <rect x="22" y="12" width="20" height="5" rx="1.5" fill="var(--ink)" />
        <rect x="27" y="50" width="10" height="5" rx="1.5" fill="var(--ink)" />
      </Die>
      <path
        d="M18 32h28M25 24v20M32 22v24M39 24v20"
        stroke="var(--ketchup-deep)"
        strokeWidth="1.6"
        opacity=".5"
      />
      <path d="M32 6v6" stroke="var(--ink)" strokeWidth="1.8" />
      <path d="M28 55v5M36 55v5" stroke="var(--mustard-deep)" strokeWidth="1.8" />
    </>
  ),
  cake: (
    <>
      <Die>
        <rect x="10" y="46" width="44" height="7" rx="3" fill="var(--cream-deep)" />
        <rect x="15" y="30" width="34" height="18" rx="2" fill="var(--cream)" />
        <rect x="15" y="28" width="34" height="7" rx="2" fill="var(--ketchup)" />
        <rect x="23" y="18" width="3.5" height="12" rx="1" fill="var(--mustard)" />
        <rect x="30" y="14" width="3.5" height="16" rx="1" fill="var(--pickle)" />
        <rect x="37" y="18" width="3.5" height="12" rx="1" fill="var(--ketchup)" />
      </Die>
      <g fill="var(--mustard-deep)">
        <path d="M24.8 17c-2-1-2-4 0-6 1.2 2 2 3 2 4 0 1-1 2-2 2Z" />
        <path d="M31.8 13c-2-1-2-4 0-6 1.2 2 2 3 2 4 0 1-1 2-2 2Z" />
        <path d="M38.8 17c-2-1-2-4 0-6 1.2 2 2 3 2 4 0 1-1 2-2 2Z" />
      </g>
      <g stroke="var(--ketchup)" strokeWidth="2" strokeLinecap="round">
        <path d="M20 40h5M30 42h4M38 39h5" />
      </g>
    </>
  ),
  burger: (
    <>
      <Die>
        <path d="M11 27c0-9 9-15 21-15s21 6 21 15Z" fill="var(--mustard)" />
        <rect x="9" y="30" width="46" height="6" rx="3" fill="var(--pickle)" />
        <rect x="10" y="36" width="44" height="7" rx="2" fill="var(--ink-muted)" />
        <rect x="11" y="43" width="42" height="5" rx="2" fill="var(--mustard-deep)" />
        <path d="M11 48h42c0 6-4 9-9 9H20c-5 0-9-3-9-9Z" fill="var(--cream-deep)" />
      </Die>
      <g fill="var(--paper)">
        <ellipse cx="24" cy="20" rx="2" ry="1.3" transform="rotate(-20 24 20)" />
        <ellipse cx="32" cy="17" rx="2" ry="1.3" />
        <ellipse cx="40" cy="21" rx="2" ry="1.3" transform="rotate(20 40 21)" />
      </g>
    </>
  ),
  pizza: (
    <>
      <Die>
        <path d="M32 6 58 52c-8 5-17 7-26 7s-18-2-26-7Z" fill="var(--mustard)" />
      </Die>
      <path
        d="M13 43c11-5 27-5 38 0"
        stroke="var(--cream-deep)"
        strokeWidth="6"
        strokeLinecap="round"
        fill="none"
      />
      <circle cx="24" cy="30" r="4" fill="var(--ketchup)" />
      <circle cx="38" cy="34" r="3.6" fill="var(--ketchup)" />
      <circle cx="30" cy="44" r="3.4" fill="var(--ketchup)" />
      <circle cx="34" cy="21" r="2.4" fill="var(--pickle)" />
    </>
  ),
  taco: (
    <>
      <Die>
        <path d="M8 26c0 18 11 30 24 30s24-12 24-30Z" fill="var(--mustard)" />
      </Die>
      <path
        d="M9 27c8-5 14 3 23-1 9-4 15 4 23 1"
        stroke="var(--pickle)"
        strokeWidth="6"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M13 34c8-4 14 4 22 0 8-4 12 3 17 1"
        stroke="var(--ketchup)"
        strokeWidth="4"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M15 42c7-3 13 3 20 0 7-3 11 2 15 0"
        stroke="var(--cream-deep)"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
      />
    </>
  ),
  glasses: (
    <>
      <Die>
        <path d="M10 10h18l-2 12c-.8 5-5 8-7 8s-6.2-3-7-8Z" fill="var(--mustard)" />
        <rect x="17" y="30" width="2.6" height="13" rx="1" fill="var(--ink-muted)" />
        <rect x="11" y="43" width="14" height="3.5" rx="1.5" fill="var(--ink-muted)" />
        <path d="M36 10h18l-2 12c-.8 5-5 8-7 8s-6.2-3-7-8Z" fill="var(--mustard)" />
        <rect x="43" y="30" width="2.6" height="13" rx="1" fill="var(--ink-muted)" />
        <rect x="37" y="43" width="14" height="3.5" rx="1.5" fill="var(--ink-muted)" />
      </Die>
      <path
        d="M30 22l1.5 3 3 .5-2.2 2.2.5 3-2.8-1.5-2.8 1.5.5-3-2.2-2.2 3-.5Z"
        fill="var(--ketchup)"
      />
      <circle cx="16" cy="19" r="1.5" fill="var(--paper)" opacity=".75" />
      <circle cx="44" cy="17" r="1.3" fill="var(--paper)" opacity=".75" />
    </>
  ),
  pumpkin: (
    <>
      <Die>
        <ellipse cx="32" cy="36" rx="22" ry="17" fill="var(--ketchup)" />
        <path d="M30 19c0-6 3-6 3-11 4 3 3 7 2 11" fill="var(--pickle)" />
      </Die>
      <ellipse cx="22" cy="36" rx="6" ry="14" fill="var(--ketchup-deep)" opacity=".28" />
      <ellipse cx="42" cy="36" rx="6" ry="14" fill="var(--ketchup-deep)" opacity=".28" />
      <path
        d="M26 22c-5 6-5 22 0 28M38 22c5 6 5 22 0 28M32 20v31"
        stroke="var(--ketchup-deep)"
        strokeWidth="1.6"
        strokeLinecap="round"
        opacity=".38"
        fill="none"
      />
      <path d="M36 17c5-3 11-1 12 4-4 3-10 1-12-4Z" fill="var(--pickle)" opacity=".85" />
    </>
  ),
  tree: (
    <>
      <Die>
        <path d="M32 6 44 24h-6l10 16h-7l11 16H12l11-16h-7l10-16h-6Z" fill="var(--pickle)" />
        <rect x="28" y="56" width="8" height="6" rx="1" fill="var(--ink-muted)" />
        <path d="M32 3l1.8 3.7 4.2.6-3 2.9.7 4.1-3.7-2-3.7 2 .7-4.1-3-2.9 4.2-.6Z" fill="var(--mustard)" />
      </Die>
      <g>
        <circle cx="22" cy="32" r="2.4" fill="var(--ketchup)" />
        <circle cx="42" cy="32" r="2.4" fill="var(--mustard)" />
        <circle cx="32" cy="43" r="2.4" fill="var(--cream)" />
        <circle cx="24" cy="50" r="2.2" fill="var(--ketchup)" />
      </g>
    </>
  ),
  basket: (
    <>
      <Die>
        <path
          d="M20 30c0-14 24-14 24 0l-5 1c0-9-14-9-14 0Z"
          fill="var(--mustard-deep)"
        />
        <path d="M12 31h40l-4 24H16Z" fill="var(--mustard)" />
        <rect x="11" y="28" width="42" height="6" rx="3" fill="var(--mustard-deep)" />
      </Die>
      <path d="M22 31h20v-5H22Z" fill="var(--cream)" />
      <path
        d="M27 26v5M37 26v5"
        stroke="var(--ketchup)"
        strokeWidth="1.6"
        opacity=".7"
      />
      <path
        d="M18 38h28M20 46h24"
        stroke="var(--ketchup-deep)"
        strokeWidth="2"
        opacity=".45"
      />
    </>
  ),
  mug: (
    <>
      <Die>
        <path
          d="M14 22h30v22c0 6-4 10-10 10H24c-6 0-10-4-10-10Z"
          fill="var(--pickle)"
        />
        <path
          d="M44 27h3c7 0 7 12 0 12h-3v-5h3c2 0 2-2 0-2h-3Z"
          fill="var(--pickle)"
        />
      </Die>
      <ellipse cx="29" cy="24" rx="13" ry="3.5" fill="var(--cream)" />
      <ellipse cx="29" cy="24" rx="10" ry="2.2" fill="var(--ink-muted)" />
      <path d="M16 28h26" stroke="var(--cream)" strokeWidth="2" opacity=".55" />
      <path
        d="M24 14c-3-3 3-5 1-9M32 15c-3-3 3-5 1-9"
        stroke="var(--ink-muted)"
        strokeWidth="2"
        fill="none"
        opacity=".4"
        strokeLinecap="round"
      />
    </>
  ),
  dice: (
    <>
      <Die>
        <rect
          x="7"
          y="18"
          width="27"
          height="27"
          rx="6"
          fill="var(--ketchup)"
          transform="rotate(-8 20 31)"
        />
        <rect
          x="31"
          y="25"
          width="26"
          height="26"
          rx="6"
          fill="var(--pickle)"
          transform="rotate(9 44 38)"
        />
      </Die>
      <g fill="var(--paper)">
        <circle cx="15" cy="29" r="2.1" />
        <circle cx="26" cy="35" r="2.1" />
        <circle cx="15" cy="42" r="2.1" />
        <circle cx="37" cy="32" r="2.1" />
        <circle cx="48" cy="43" r="2.1" />
      </g>
    </>
  ),
  butterfly: (
    <>
      <Die>
        <path d="M32 32C18 10 6 16 8 28 4 38 16 44 30 36Z" fill="var(--ketchup)" />
        <path d="M32 32C46 10 58 16 56 28 60 38 48 44 34 36Z" fill="var(--mustard)" />
        <path d="M32 32C20 44 10 46 10 52 20 56 28 48 32 40Z" fill="var(--mustard-deep)" />
        <path d="M32 32C44 44 54 46 54 52 44 56 36 48 32 40Z" fill="var(--ketchup-deep)" />
        <ellipse cx="32" cy="36" rx="3.4" ry="13" fill="var(--ink)" />
      </Die>
      <path
        d="M32 23c-2-4-5-5-8-4M32 23c2-4 5-5 8-4"
        stroke="var(--ink)"
        strokeWidth="1.8"
        strokeLinecap="round"
        fill="none"
      />
      <circle cx="19" cy="27" r="2" fill="var(--paper)" opacity=".6" />
      <circle cx="45" cy="27" r="2" fill="var(--paper)" opacity=".6" />
    </>
  ),
  ant: (
    <>
      <Die>
        <ellipse cx="16" cy="40" rx="8" ry="6" fill="var(--ink)" />
        <circle cx="29" cy="38" r="5" fill="var(--ink)" />
        <circle cx="39" cy="37" r="4" fill="var(--ink)" />
      </Die>
      <g stroke="var(--ink)" strokeWidth="2" strokeLinecap="round" fill="none">
        <path d="M26 33l-4-6M31 33l2-7M35 34l6-4M26 43l-5 7M32 43l3 7M36 41l7 4" />
        <path d="M39 33c2-4 5-5 8-4M41 35c3-2 6-2 8 0" />
      </g>
      <circle cx="41" cy="36" r="1" fill="var(--paper)" />
    </>
  ),
  leaf: (
    <>
      <Die>
        <path d="M12 20C26 4 52 8 54 30 40 52 18 52 12 20Z" fill="var(--mustard)" />
      </Die>
      <path
        d="M13 20l41 10M22 26l4 10M30 30l4 10M38 34l3 8"
        stroke="var(--mustard-deep)"
        strokeWidth="2"
        fill="none"
        opacity=".65"
      />
      <path
        d="M12 20C7 28 6 38 12 46"
        stroke="var(--ink-muted)"
        strokeWidth="2.5"
        fill="none"
        strokeLinecap="round"
      />
    </>
  ),
  snowflake: (
    <>
      <g stroke="var(--paper)" strokeWidth="9" strokeLinecap="round">
        <path d="M32 6v52M9 19l46 26M55 19 9 45" />
      </g>
      <g stroke="var(--pickle)" strokeWidth="4" strokeLinecap="round">
        <path d="M32 6v52M9 19l46 26M55 19 9 45" />
        <path d="M32 18l-5-5M32 18l5-5M32 46l-5 5M32 46l5 5M22 24l-6 1M22 24l-1-6M42 40l6-1M42 40l1 6M42 24l6 1M42 24l1-6M22 40l-6-1M22 40l-1 6" />
      </g>
    </>
  ),
  star: (
    <>
      <Die>
        <path d="M32 5l8 17 18 2-13 13 3 18-16-8-16 8 3-18L6 24l18-2Z" fill="var(--mustard)" />
      </Die>
      <path
        d="M32 14l4 10 9 1-7 7 2 9-8-4-8 4 2-9-7-7 9-1Z"
        fill="var(--mustard-deep)"
        opacity=".28"
      />
    </>
  ),
  heart: (
    <>
      <Die>
        <path
          d="M32 56C16 44 8 35 8 25c0-8 6-14 14-14 5 0 8 3 10 6 2-3 5-6 10-6 8 0 14 6 14 14 0 10-8 19-24 31Z"
          fill="var(--ketchup)"
        />
      </Die>
      <path
        d="M20 22c-3 1-4 4-3 7"
        stroke="var(--paper)"
        strokeWidth="3"
        opacity=".35"
        fill="none"
        strokeLinecap="round"
      />
    </>
  ),
  ticket: (
    <>
      <Die>
        <path d="M8 18h48v12a6 6 0 0 0 0 8v12H8V38a6 6 0 0 0 0-8Z" fill="var(--paper)" />
        <path d="M8 18h48v5H8Z" fill="var(--ketchup)" />
      </Die>
      <path d="M32 24v26" stroke="var(--ink-muted)" strokeWidth="1.6" strokeDasharray="3 4" />
      <path d="M14 30h11M14 36h7M38 30h11M38 36h7" stroke="var(--ink-muted)" strokeWidth="2" strokeLinecap="round" />
    </>
  ),
  bag: (
    <>
      <Die>
        <path d="M13 24h38l-4 34H17Z" fill="var(--pickle-soft)" />
        <path d="M21 24v-5c0-13 22-13 22 0v5h-6v-5c0-7-10-7-10 0v5Z" fill="var(--pickle)" />
      </Die>
      <path d="M22 32v18M42 32v18" stroke="var(--pickle)" strokeWidth="2.5" opacity=".7" />
      <path d="M27 38h10" stroke="var(--ketchup)" strokeWidth="2" strokeLinecap="round" />
    </>
  ),
  popper: (
    <>
      <Die>
        <path d="M12 60 32 26l16 10-21 30Z" fill="var(--ketchup)" />
        <path d="M32 26l16 10 4-4-15-11Z" fill="var(--mustard-deep)" />
      </Die>
      <path
        d="M18 54l14-9M21 60l15-10"
        stroke="var(--paper)"
        strokeWidth="2.8"
        strokeLinecap="round"
        opacity=".9"
      />
      <g strokeLinecap="round" fill="none">
        <path d="M50 30c7-5 10-2 16-8" stroke="var(--mustard)" strokeWidth="3.6" />
        <path d="M47 37c9-2 11 2 17-3" stroke="var(--pickle)" strokeWidth="3.2" />
        <path d="M53 22c2-8 8-10 13-11" stroke="var(--ketchup)" strokeWidth="3.2" />
        <path d="M42 22c-2-8 0-13 5-17" stroke="var(--mustard-deep)" strokeWidth="2.8" />
      </g>
      <g>
        <circle cx="61" cy="15" r="3.2" fill="var(--pickle)" />
        <circle cx="42" cy="9" r="2.6" fill="var(--ketchup)" />
        <path
          d="M31 4l2.2 4.6 5 .6-3.7 3.4 1 5-4.5-2.6-4.5 2.6 1-5L24 9.2l5-.6Z"
          fill="var(--mustard)"
        />
        <path d="M57 34c4-2 7-1 8 2-3 2-6 1-8-2Z" fill="var(--pickle-soft)" />
      </g>
    </>
  ),
  plate: (
    <>
      <Die>
        <rect x="22" y="16" width="26" height="26" rx="3" fill="var(--paper)" transform="rotate(8 35 29)" />
        <circle cx="31" cy="36" r="18" fill="var(--cream)" />
        <circle cx="31" cy="36" r="13" fill="var(--paper)" />
      </Die>
      <g opacity=".85">
        <path d="M22 22h8M22 28h8M22 34h8M30 22v12" stroke="var(--ketchup)" strokeWidth="1.6" />
        <path d="M24 22v12M27 22v12" stroke="var(--ketchup)" strokeWidth="1.2" opacity=".55" />
      </g>
      <path d="M49 22v22M49 22c3 0 4 2 4 4s-1 4-4 4" stroke="var(--ink-muted)" strokeWidth="2" fill="none" strokeLinecap="round" />
    </>
  ),
  grill: (
    <>
      <Die>
        <path d="M8 34h48l-6 18H14Z" fill="var(--ink)" />
        <path d="M8 34h48" strokeWidth="4" />
        <path d="M17 52 12 62M47 52l5 10M32 52v10" />
      </Die>
      <g stroke="var(--paper)" strokeWidth="2.4" strokeLinecap="round">
        <path d="M16 40h32M19 46h26" />
      </g>
      <g>
        <path d="M24 33c-4 -3 1-6 -1-10 4 2 5 5 4 8 2-1 3-2 3-4 2 3 2 6 1 8" fill="var(--ember)" />
        <path d="M38 33c-3-2 1-5-1-8 3 2 4 4 3 6 2-1 2-2 2-3 2 2 2 4 1 6" fill="var(--flame)" />
        <circle cx="31" cy="35" r="2" fill="var(--flame-tip)" />
      </g>
      <g fill="var(--mustard)">
        <circle cx="18" cy="24" r="2.2" />
        <circle cx="46" cy="21" r="1.8" />
      </g>
    </>
  ),
};

const SIZES = { sm: "2.5rem", md: "4rem", lg: "6rem", xl: "10rem", xxl: "12rem" } as const;

/** A deterministic tilt so a row of stickers never lands on the same angle. */
function defaultTilt(name: StickerName): number {
  let hash = 7;
  for (const character of name) hash = (hash * 31 + character.charCodeAt(0)) % 9973;
  return ((hash % 13) - 6) * 0.9;
}

/**
 * A hand-made paper sticker: flat palette fills, a thick white die-cut edge and
 * a soft printed shadow. Purely decorative, so it is always aria-hidden.
 */
export function Sticker({
  name,
  size = "md",
  tilt,
  peel = false,
  delay = 0,
  className = "",
}: {
  name: StickerName;
  size?: keyof typeof SIZES;
  tilt?: number;
  /** Peel on once, then rest at the tilted angle. */
  peel?: boolean;
  /** Seconds to wait before peeling, for a sequence of stickers. */
  delay?: number;
  className?: string;
}) {
  const angle = tilt ?? defaultTilt(name);
  return (
    <span
      aria-hidden="true"
      className={`sticker sticker-${size} ${peel ? "sticker-peel" : ""} ${className}`}
      style={
        {
          "--sticker-size": SIZES[size],
          "--tilt": `${angle}deg`,
          "--peel-delay": `${delay}s`,
        } as CSSProperties
      }
    >
      <svg viewBox="0 0 64 64" focusable="false" aria-hidden="true">
        {DESIGNS[name]}
      </svg>
    </span>
  );
}
