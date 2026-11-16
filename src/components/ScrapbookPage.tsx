import Link from "next/link";
import type { ReactNode } from "react";
import { OccasionScene } from "./occasion/OccasionScene";
import { Bunting } from "./scrapbook/Bunting";
import { Sticker } from "./scrapbook/Sticker";
import { WashiTape } from "./scrapbook/WashiTape";
import { Wordmark } from "./ui/Wordmark";
import type { OccasionTheme } from "@/lib/occasion";
import { occasionHero } from "@/lib/occasion";

type Variant = "base" | "occasion";

/**
 * The shared scrapbook page: a decorated panel beside the slip, both inside one
 * centred spread. Base pages compose a picnic scene; guest pages show the
 * event's occasion scene with a large hero illustration.
 */
export function ScrapbookPage({
  headline,
  detail,
  cover,
  theme,
  previewTheme,
  variant = "base",
  children,
  className = "",
}: {
  headline: ReactNode;
  detail?: ReactNode;
  cover?: ReactNode;
  theme?: OccasionTheme;
  /** New event: preview the cover's theme with a large hero sticker. */
  previewTheme?: OccasionTheme;
  variant?: Variant;
  children: ReactNode;
  className?: string;
}) {
  const occasion = variant === "occasion" && theme;
  const heroTheme = previewTheme ?? "picnic";
  const hero = occasion ? occasionHero(theme) : previewTheme ? occasionHero(heroTheme) : "basket";

  return (
    <main className={`scrapbook-page ${className}`}>
      <div className="scrapbook-rail">
        <section
          className={`scrapbook-panel ${
            occasion ? "scrapbook-panel-occasion" : "scrapbook-panel-base"
          }`}
        >
          {occasion ? (
            <>
              <span className="scrapbook-scene-strip">
                <OccasionScene theme={theme} size="strip" />
              </span>
              <span className="scrapbook-scene-panel">
                <OccasionScene theme={theme} size="panel" />
              </span>
            </>
          ) : (
            <>
              <Bunting count={14} className="scrapbook-bunting" />
              <span className="scrapbook-base-scene" aria-hidden="true">
                <span className="scrapbook-blanket" />
                <span className={`scrapbook-hero ${previewTheme ? "scrapbook-hero-preview" : ""}`}>
                  <Sticker name={hero} size="xl" tilt={-4} className="base-hero-main" />
                  {previewTheme ? (
                    <>
                      <Sticker
                        name="heart"
                        size="sm"
                        tilt={10}
                        className="base-hero-small base-hero-small-top"
                      />
                      <Sticker
                        name="star"
                        size="sm"
                        tilt={-8}
                        className="base-hero-small base-hero-small-bottom"
                      />
                    </>
                  ) : (
                    <>
                      <Sticker
                        name="watermelon"
                        size="lg"
                        tilt={-11}
                        className="base-hero-small base-hero-small-left"
                      />
                      <Sticker
                        name="mug"
                        size="md"
                        tilt={7}
                        className="base-hero-small base-hero-small-right"
                      />
                    </>
                  )}
                </span>
              </span>
            </>
          )}

          <div
            className={`scrapbook-panel-inner ${
              occasion ? "scrapbook-panel-inner-occasion" : "scrapbook-panel-inner-base"
            }`}
          >
            <Link href="/" aria-label="Spread home" className="scrapbook-home paper-label">
              <Wordmark />
            </Link>

            <div className="scrapbook-base-copy">
              <div className="scrapbook-label paper-label">
                <WashiTape
                  pattern={occasion ? "gingham" : "stripe"}
                  tone={occasion ? "ketchup" : "mustard"}
                  tilt={-2}
                />
                <div className="scrapbook-copy">
                  {cover ? <div className="scrapbook-cover">{cover}</div> : null}
                  <div>
                    <h1 className="scrapbook-headline">{headline}</h1>
                    {detail ? <div className="scrapbook-detail">{detail}</div> : null}
                  </div>
                </div>
              </div>

              {occasion ? (
                <Sticker
                  name="star"
                  size="sm"
                  tilt={10}
                  className="occasion-label-sticker"
                />
              ) : null}

              {!occasion ? (
                <>
                  <Sticker
                    name="sun"
                    size="md"
                    peel
                    delay={0.1}
                    className="base-cluster-sticker base-cluster-sun"
                  />
                  <Sticker
                    name="star"
                    size="sm"
                    peel
                    delay={0.25}
                    className="base-cluster-sticker base-cluster-star"
                  />
                  <Sticker
                    name="balloon"
                    size="md"
                    peel
                    delay={0.4}
                    className="base-cluster-sticker base-cluster-balloon"
                  />
                </>
              ) : null}
            </div>
          </div>
        </section>
      </div>

      <div className="scrapbook-slip">
        <div className="scrapbook-slip-inner">{children}</div>
      </div>
    </main>
  );
}
