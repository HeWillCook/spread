import Link from "next/link";
import type { ReactNode } from "react";
import { GrillBand } from "./fire/GrillBand";
import { Wordmark } from "./ui/Wordmark";

/**
 * The two-pane fire page: a tall, sticky coal band with a headline beside the
 * slip. Below `lg` the band becomes a short strip above the slip. Used by the
 * sign-in, sign-up, new-event and guest RSVP screens.
 */
export function FirePage({
  headline,
  detail,
  cover,
  children,
  className = "",
}: {
  headline: ReactNode;
  detail?: ReactNode;
  /** Event cover for the guest page, shown beside the headline. */
  cover?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <main className={`fire-page ${className}`}>
      <div className="fire-rail">
        <GrillBand
          inset
          edge="bottom"
          flameSize="lg"
          emberCount={24}
          emberRise={220}
          className="fire-band"
        >
          <div className="fire-band-inner">
            <Link href="/" aria-label="Spread home" className="fire-home">
              <Wordmark />
            </Link>
            <div className="fire-band-copy">
              {cover ? <div className="fire-cover">{cover}</div> : null}
              <div className="fire-copy-text">
                <h1 className="fire-headline">{headline}</h1>
                {detail ? <div className="fire-detail">{detail}</div> : null}
              </div>
            </div>
          </div>
        </GrillBand>
      </div>
      <div className="fire-slip">
        <div className="fire-slip-inner">{children}</div>
      </div>
    </main>
  );
}
