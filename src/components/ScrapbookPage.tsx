import Link from "next/link";
import type { ReactNode } from "react";
import { OccasionScene } from "./occasion/OccasionScene";
import { Bunting } from "./scrapbook/Bunting";
import { Sticker } from "./scrapbook/Sticker";
import { WashiTape } from "./scrapbook/WashiTape";
import { Wordmark } from "./ui/Wordmark";
import type { OccasionTheme } from "@/lib/occasion";

type Variant = "base" | "occasion";

/**
 * The shared scrapbook page: a sticky decorated panel beside the slip. Base
 * pages get a gingham blanket, bunting and loose stickers; guest pages get the
 * event's occasion scene behind a paper title label.
 */
export function ScrapbookPage({
  headline,
  detail,
  cover,
  theme,
  variant = "base",
  children,
  className = "",
}: {
  headline: ReactNode;
  detail?: ReactNode;
  cover?: ReactNode;
  theme?: OccasionTheme;
  variant?: Variant;
  children: ReactNode;
  className?: string;
}) {
  const occasion = variant === "occasion" && theme;

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
          ) : null}

          {!occasion ? <Bunting count={14} className="scrapbook-bunting" /> : null}

          <div className="scrapbook-panel-inner">
            <Link href="/" aria-label="Spread home" className="scrapbook-home paper-label">
              <Wordmark />
            </Link>

            {!occasion ? (
              <>
                <Sticker
                  name="sun"
                  size="md"
                  peel
                  delay={0.1}
                  className="scrapbook-sticker scrapbook-sticker-sun"
                />
                <Sticker
                  name="balloon"
                  size="md"
                  peel
                  delay={0.25}
                  className="scrapbook-sticker scrapbook-sticker-balloon"
                />
                <Sticker
                  name="watermelon"
                  size="md"
                  peel
                  delay={0.4}
                  className="scrapbook-sticker scrapbook-sticker-watermelon"
                />
                <Sticker
                  name="star"
                  size="md"
                  peel
                  delay={0.55}
                  className="scrapbook-sticker scrapbook-sticker-star"
                />
              </>
            ) : null}

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
          </div>
        </section>
      </div>

      <div className="scrapbook-slip">
        <div className="scrapbook-slip-inner">{children}</div>
      </div>
    </main>
  );
}
