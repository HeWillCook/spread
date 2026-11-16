import type { CSSProperties } from "react";
import type { OccasionTheme } from "@/lib/occasion";
import { EmberBurst } from "@/components/fire/EmberBurst";
import { between, round, seeded } from "@/components/scrapbook/seed";

interface BurstBit {
  x: number;
  size: number;
  dur: number;
  delay: number;
  drift: number;
  rise: number;
  spin: number;
  tone: string;
}

const TONES = [
  "var(--ketchup)",
  "var(--mustard)",
  "var(--pickle)",
  "var(--mustard-deep)",
  "var(--cream-deep)",
];

function makeBits(seed: number): BurstBit[] {
  const rand = seeded(seed);
  return Array.from({ length: 13 }, () => ({
    x: between(rand, 4, 96),
    size: between(rand, 4, 9),
    dur: between(rand, 1.1, 1.5),
    delay: between(rand, 0, 0.22),
    drift: between(rand, -36, 36),
    rise: between(rand, -110, -62),
    spin: between(rand, -120, 120),
    tone: TONES[Math.floor(rand() * TONES.length)],
  }));
}

function bitStyle(bit: BurstBit): CSSProperties {
  return {
    "--x": `${round(bit.x, 1)}%`,
    "--size": `${round(bit.size, 1)}px`,
    "--dur": `${round(bit.dur, 2)}s`,
    "--delay": `${round(bit.delay, 2)}s`,
    "--drift": `${round(bit.drift, 1)}px`,
    "--rise": `${round(bit.rise, 1)}px`,
    "--spin": `${round(bit.spin, 1)}deg`,
    "--tone": bit.tone,
  } as CSSProperties;
}

function Star({ colour }: { colour: string }) {
  return (
    <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
      <path
        d="M12 2l2.9 6.2 6.8.8-5 4.7 1.3 6.8-6-3.5-6 3.5 1.3-6.8-5-4.7 6.8-.8Z"
        fill={colour}
      />
    </svg>
  );
}

function Heart({ colour }: { colour: string }) {
  return (
    <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
      <path
        d="M12 21C5.5 16 2 12.3 2 8.4 2 5.4 4.4 3 7.3 3c1.9 0 3.4 1 4.7 2.6C13.3 4 14.8 3 16.7 3 19.6 3 22 5.4 22 8.4c0 3.9-3.5 7.6-10 12.6Z"
        fill={colour}
      />
    </svg>
  );
}

function Leaf({ colour }: { colour: string }) {
  return (
    <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
      <path d="M4 3c11 0 17 6 17 17C10 20 3 14 4 3Z" fill={colour} />
    </svg>
  );
}

function Snow({ colour }: { colour: string }) {
  return (
    <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
      <g stroke={colour} strokeWidth="2" strokeLinecap="round">
        <path d="M12 2v20M3.3 7l17.4 10M20.7 7 3.3 17" />
      </g>
    </svg>
  );
}

function Butterfly({ colour }: { colour: string }) {
  return (
    <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
      <path d="M12 12C8 4 3 5 3 9c0 4 5 5 9 3Z" fill={colour} />
      <path d="M12 12c4-8 9-7 9-3 0 4-5 5-9 3Z" fill="var(--mustard)" />
      <ellipse cx="12" cy="13" rx="1.4" ry="5" fill="var(--ink)" />
    </svg>
  );
}

function BurstGlyph({ theme, colour }: { theme: OccasionTheme; colour: string }) {
  switch (theme) {
    case "birthday":
    case "gamenight":
      return <Star colour={colour} />;
    case "toast":
      return <span className="burst-bubble" style={{ borderColor: colour }} />;
    case "harvest":
      return <Leaf colour={colour} />;
    case "holiday":
      return <Snow colour={colour} />;
    case "picnic":
      return <Butterfly colour={colour} />;
    case "brunch":
      return <Heart colour={colour} />;
    case "pizzeria":
      return <span className="burst-steam" />;
    default:
      return <span className="burst-confetti" style={{ background: colour }} />;
  }
}

/**
 * A one-time success burst in an occasion's voice. Mount it over a relative
 * parent; the bits rise once and are gone. Cookout reuses the ember burst.
 */
export function OccasionBurst({
  theme,
  className = "",
}: {
  theme: OccasionTheme;
  className?: string;
}) {
  if (theme === "cookout") {
    return <EmberBurst className={className} />;
  }

  const bits = makeBits(0xb0057 + theme.length * 31);
  return (
    <span aria-hidden="true" className={`occasion-burst ${className}`}>
      {bits.map((bit, index) => (
        <span key={index} className="occasion-burst-bit" style={bitStyle(bit)}>
          <BurstGlyph theme={theme} colour={bit.tone} />
        </span>
      ))}
    </span>
  );
}
