import type { CSSProperties, ReactNode } from "react";
import type { OccasionTheme } from "@/lib/occasion";
import { occasionHero } from "@/lib/occasion";
import { Sticker } from "@/components/scrapbook/Sticker";
import { Bunting } from "@/components/scrapbook/Bunting";
import { Embers } from "@/components/fire/Embers";
import { Flames } from "@/components/fire/Flames";
import { between, round, seeded } from "@/components/scrapbook/seed";

type SceneSize = "strip" | "compact" | "panel";

interface Bit {
  x: number;
  y: number;
  size: number;
  dur: number;
  delay: number;
  drift: number;
  rise: number;
  spin: number;
}

const TONES = [
  "var(--ketchup)",
  "var(--mustard)",
  "var(--pickle)",
  "var(--cream-deep)",
  "var(--mustard-deep)",
];

function makeBits(count: number, seed: number, small: boolean): Bit[] {
  const rand = seeded(seed);
  return Array.from({ length: count }, () => ({
    x: between(rand, 4, 96),
    y: between(rand, 4, 86),
    size: small ? between(rand, 3.5, 7.5) : between(rand, 6.5, 16),
    dur: between(rand, 7, 13),
    delay: -between(rand, 0, 8),
    drift: between(rand, -12, 12),
    rise: between(rand, -18, 12),
    spin: between(rand, -80, 80),
  }));
}

function bitStyle(bit: Bit, tone: string): CSSProperties {
  return {
    "--x": `${round(bit.x, 1)}%`,
    "--y": `${round(bit.y, 1)}%`,
    "--size": `${round(bit.size, 1)}px`,
    "--dur": `${round(bit.dur, 2)}s`,
    "--delay": `${round(bit.delay, 2)}s`,
    "--drift": `${round(bit.drift, 1)}px`,
    "--rise": `${round(bit.rise, 1)}px`,
    "--spin": `${round(bit.spin, 1)}deg`,
    "--tone": tone,
  } as CSSProperties;
}

function StarGlyph({ colour }: { colour: string }) {
  return (
    <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
      <path
        d="M12 2l2.9 6.2 6.8.8-5 4.7 1.3 6.8-6-3.5-6 3.5 1.3-6.8-5-4.7 6.8-.8Z"
        fill={colour}
      />
    </svg>
  );
}

function LeafGlyph({ colour }: { colour: string }) {
  return (
    <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
      <path d="M4 3c11 0 17 6 17 17C10 20 3 14 4 3Z" fill={colour} />
      <path d="M6 5c4 5 7 8 12 13" stroke="var(--paper)" strokeWidth="1" opacity=".55" fill="none" />
    </svg>
  );
}

function RibbonGlyph({ colour }: { colour: string }) {
  return (
    <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
      <path
        d="M2 12c3-9 6 9 9 0s6 9 9 0"
        fill="none"
        stroke={colour}
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

function HeartGlyph({ colour }: { colour: string }) {
  return (
    <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
      <path
        d="M12 21C5 16 2 12.2 2 8.6 2 5.7 4.4 3.6 7 3.6c2 0 3.8 1.2 5 3 1.2-1.8 3-3 5-3 2.6 0 5 2.1 5 5 0 3.6-3 7.4-10 12.4Z"
        fill={colour}
      />
    </svg>
  );
}

function SnowGlyph({ colour }: { colour: string }) {
  return (
    <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
      <g stroke={colour} strokeWidth="2" strokeLinecap="round">
        <path d="M12 2v20M3.3 7l17.4 10M20.7 7 3.3 17" />
        <path d="M9 4l3 2 3-2M9 20l3-2 3 2" strokeWidth="1.4" />
      </g>
    </svg>
  );
}

function Particles({
  count,
  seed,
  small,
  scale = 1,
  glyph,
}: {
  count: number;
  seed: number;
  small: boolean;
  /** Visual weight multiplier, for shapes that read small at their normal size. */
  scale?: number;
  glyph: (tone: string, index: number) => ReactNode;
}) {
  return makeBits(count, seed, small).map((bit, index) => (
    <span
      key={index}
      className="scene-bit"
      style={bitStyle({ ...bit, size: bit.size * scale }, TONES[index % TONES.length])}
    >
      {glyph(TONES[index % TONES.length], index)}
    </span>
  ));
}

function Confetti({ count, small }: { count: number; small: boolean }) {
  return (
    <>
      {Particles({
        count,
        seed: 0xc0f7,
        small,
        glyph: (tone, index) => {
          if (index % 6 === 0) return <StarGlyph colour={tone} />;
          if (index % 6 === 1) return <RibbonGlyph colour={tone} />;
          if (index % 6 === 2) {
            return <span className="scene-confetti-fill" style={{ borderRadius: "50%" }} />;
          }
          if (index % 6 === 3) return <span className="scene-confetti-fill scene-confetti-strip" />;
          return <span className="scene-confetti-fill" />;
        },
      })}
    </>
  );
}

function Sprinkles({ count, small }: { count: number; small: boolean }) {
  return (
    <>
      {makeBits(count, 0x5a1, small).map((bit, index) => (
        <span
          key={index}
          className="scene-bit scene-sprinkle"
          style={{
            ...bitStyle(bit, TONES[index % TONES.length]),
            background: TONES[index % TONES.length],
          }}
        />
      ))}
    </>
  );
}

function Steam({ count = 3 }: { count?: number }) {
  const rand = seeded(0x57ea);
  return (
    <>
      {Array.from({ length: count }, (_, index) => (
        <span
          key={index}
          className="scene-steam"
          style={
            {
              "--x": `${round(between(rand, 41, 59), 1)}%`,
              "--y": `${round(between(rand, 32, 48), 1)}%`,
              "--dur": `${round(between(rand, 6, 9), 2)}s`,
              "--delay": `${round(-between(rand, 0, 6), 2)}s`,
            } as CSSProperties
          }
        >
          <svg viewBox="0 0 30 80" focusable="false" aria-hidden="true">
            <path
              d="M15 76c-8-11 8-16 0-29s6-17 0-28"
              fill="none"
              stroke="var(--paper)"
              strokeWidth="5"
              strokeLinecap="round"
              opacity=".75"
            />
            <path
              d="M15 76c-8-11 8-16 0-29s6-17 0-28"
              fill="none"
              stroke="var(--ink-muted)"
              strokeWidth="1.8"
              strokeLinecap="round"
              opacity=".5"
            />
          </svg>
        </span>
      ))}
      {Array.from({ length: 4 }, (_, index) => (
        <span
          key={`puff-${index}`}
          className="scene-puff"
          style={
            {
              "--x": `${round(between(rand, 52, 80), 1)}%`,
              "--y": `${round(between(rand, 12, 32), 1)}%`,
              "--dur": `${round(between(rand, 5, 8), 2)}s`,
              "--delay": `${round(-between(rand, 0, 5), 2)}s`,
            } as CSSProperties
          }
        />
      ))}
    </>
  );
}

function Lights() {
  const rand = seeded(0x1177);
  const lights = Array.from({ length: 9 }, (_, index) => {
    const t = (index + 0.5) / 9;
    return {
      left: t * 100,
      top: 8 + 22 * 4 * t * (1 - t),
      delay: -between(rand, 0, 3),
    };
  });
  return (
    <span className="scene-lights">
      <svg viewBox="0 0 100 40" preserveAspectRatio="none" focusable="false" aria-hidden="true">
        <path d="M0 8Q50 32 100 8" fill="none" stroke="var(--ink)" strokeWidth="1.2" opacity=".35" />
      </svg>
      {lights.map((light, index) => (
        <span
          key={index}
          className="scene-light"
          style={
            {
              left: `${round(light.left, 1)}%`,
              top: `${round(light.top, 1)}px`,
              "--delay": `${round(light.delay, 2)}s`,
            } as CSSProperties
          }
        />
      ))}
    </span>
  );
}

function StringLights() {
  return <Lights />;
}

function Candles() {
  const colours = ["var(--mustard)", "var(--pickle)", "var(--ketchup)"];
  return (
    <span className="scene-candles">
      {colours.map((colour, index) => (
        <span
          key={colour}
          className="scene-candle"
          style={
            {
              background: colour,
              "--delay": `${round(index * 0.22, 2)}s`,
            } as CSSProperties
          }
        />
      ))}
    </span>
  );
}

function Ants({ count }: { count: number }) {
  const rand = seeded(0xa175);
  return (
    <span className="scene-ants">
      {Array.from({ length: count }, (_, index) => (
        <span
          key={index}
          className="scene-ant"
          style={
            {
              "--x": `${round((index + 0.5) * (80 / count) + between(rand, -3, 3), 1)}%`,
              "--dur": `${round(between(rand, 6, 9), 2)}s`,
              "--delay": `${round(-between(rand, 0, 3), 2)}s`,
            } as CSSProperties
          }
        >
          <Sticker name="ant" size="sm" />
        </span>
      ))}
    </span>
  );
}

function Butterfly() {
  return (
    <span className="scene-butterfly" style={{ "--x": "12%", "--y": "28%" } as CSSProperties}>
      <Sticker name="butterfly" size="sm" />
    </span>
  );
}

function Balloons({ count, small }: { count: number; small: boolean }) {
  const rand = seeded(0xba110);
  const spots = [
    { x: 14, y: 18 },
    { x: 78, y: 12 },
    { x: 88, y: 28 },
  ];
  return (
    <>
      {spots.slice(0, count).map((spot, index) => (
        <span
          key={index}
          className="scene-balloon"
          style={
            {
              "--x": `${spot.x + between(rand, -3, 3)}%`,
              "--y": `${spot.y + between(rand, -4, 4)}%`,
              "--dur": `${round(between(rand, 7, 11), 2)}s`,
              "--delay": `${round(-between(rand, 0, 5), 2)}s`,
            } as CSSProperties
          }
        >
          <Sticker name="balloon" size={small || index === 1 ? "sm" : "md"} tilt={index % 2 ? 6 : -7} />
        </span>
      ))}
    </>
  );
}

function Dice() {
  return (
    <span className="scene-die">
      <Sticker name="dice" size="sm" />
    </span>
  );
}

/**
 * A contained theme scene: a strip of life behind a masthead or ticket, or a
 * full panel behind a guest title. Everything is decorative and deterministic.
 */
export function OccasionScene({
  theme,
  size = "panel",
  className = "",
}: {
  theme: OccasionTheme;
  size?: SceneSize;
  className?: string;
}) {
  const strip = size === "strip";
  const compact = size === "compact";
  const count = strip ? 22 : compact ? 20 : 66;
  
  return (
    <span
      aria-hidden="true"
      className={`occasion-scene occasion-${theme} ${
        strip ? "occasion-strip" : compact ? "occasion-compact" : "occasion-panel"
      } ${className}`}
    >
      {theme === "party" ? (
        <>
          <Confetti count={count} small={strip || compact} />
          {!strip ? <Balloons count={compact ? 2 : 3} small={compact} /> : null}
        </>
      ) : null}
      {theme === "cookout" ? (
        <>
          <Embers count={strip ? 14 : 52} rise={strip ? 70 : 900} />
          <Steam count={strip ? 2 : 7} />
          <Bunting count={strip ? 10 : 18} className="scene-bunting" />
          {!strip ? (
            <span className="scene-lanterns" aria-hidden="true">
              {[
                { x: "38%", y: "8.6rem", size: "sm", tilt: 6, dur: "7.8s", delay: "-4.1s" },
                { x: "52%", y: "4.2rem", size: "md", tilt: -5, dur: "6.5s", delay: "-1s" },
                { x: "71%", y: "7.5rem", size: "sm", tilt: 5, dur: "7.5s", delay: "-3.5s" },
                { x: "87%", y: "5.4rem", size: "sm", tilt: -8, dur: "6s", delay: "-2.2s" },
              ].map((lantern) => (
                <span
                  key={lantern.x}
                  className="scene-lantern"
                  style={
                    {
                      "--x": lantern.x,
                      "--y": lantern.y,
                      "--dur": lantern.dur,
                      "--delay": lantern.delay,
                    } as CSSProperties
                  }
                >
                  <Sticker
                    name="lantern"
                    size={lantern.size as "sm" | "md"}
                    tilt={lantern.tilt}
                  />
                </span>
              ))}
            </span>
          ) : null}
          <span className="scene-fire">
            <Flames edge="bottom" size="sm" />
          </span>
        </>
      ) : null}
      {theme === "birthday" ? (
        <>
          <Confetti count={strip ? 10 : count} small={strip || compact} />
          <Sprinkles count={strip ? 8 : compact ? 8 : 14} small={strip || compact} />
          {strip ? <Candles /> : null}
          {!strip ? <Balloons count={compact ? 2 : 3} small={compact} /> : null}
        </>
      ) : null}
      {theme === "pizzeria" && strip ? <Steam count={3} /> : null}
      {theme === "fiesta" ? (
        <>
          <Confetti count={count} small={strip} />
          <Bunting count={strip ? 10 : 16} variant="picado" className="scene-bunting" />
        </>
      ) : null}
      {theme === "toast" ? (
        <>
          <StringLights />
          {Particles({
            count,
            seed: 0xb0bb1e,
            small: strip,
            glyph: (tone) => <span className="scene-bubble" style={{ borderColor: tone }} />,
          })}
        </>
      ) : null}
      {theme === "harvest" ? (
        <>
          {Particles({
            count,
            seed: 0x1eaf,
            small: strip,
            glyph: (tone) => <LeafGlyph colour={tone} />,
          })}
        </>
      ) : null}
      {theme === "holiday" ? (
        <>
          <StringLights />
          {Particles({
            count,
            seed: 0x5f0a,
            small: strip,
            glyph: () => <SnowGlyph colour="var(--paper)" />,
          })}
        </>
      ) : null}
      {theme === "picnic" ? (
        <>
          <Butterfly />
          <Ants count={strip ? 4 : 4} />
        </>
      ) : null}
      {theme === "brunch" ? (
        <>
          <Steam count={strip ? 3 : 5} />
          <Bunting count={strip ? 10 : 18} className="scene-bunting" />
          {Particles({
            count: strip ? 3 : 13,
            seed: 0x4ea7,
            small: strip,
            scale: 1.7,
            glyph: (tone) => <HeartGlyph colour={tone} />,
          })}
        </>
      ) : null}
      {theme === "gamenight" ? (
        <>
          {Particles({
            count,
            seed: 0x9a3e,
            small: strip,
            glyph: (tone) => <StarGlyph colour={tone} />,
          })}
          {strip ? <Dice /> : null}
        </>
      ) : null}

      {!strip ? <span className={`scene-floor scene-floor-${theme}`} /> : null}

      {!strip && !compact ? (
        <span className={`scene-hero scene-hero-${theme}`}>
          <Sticker name={occasionHero(theme)} size={compact ? "lg" : "xxl"} tilt={-4} />
          {theme === "birthday" ? (
            <span className="scene-hero-flames" aria-hidden="true">
              <span />
              <span />
              <span />
            </span>
          ) : null}
        </span>
      ) : null}
    </span>
  );
}
