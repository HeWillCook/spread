import Link from "next/link";
import { Bunting } from "@/components/scrapbook/Bunting";
import { Sticker } from "@/components/scrapbook/Sticker";
import { WashiTape } from "@/components/scrapbook/WashiTape";
import { Wordmark } from "@/components/ui/Wordmark";

export default function NotFound() {
  return (
    <main className="picnic-404">
      <Bunting count={24} className="picnic-404-bunting" />

      <div className="picnic-404-inner">
        <div className="paper-label picnic-404-card">
          <WashiTape
            pattern="dots"
            tone="ketchup"
            tilt={-2}
            className="picnic-404-tape"
          />
          <Link href="/" aria-label="Spread home" className="wordmark-link inline-flex">
            <Wordmark />
          </Link>
          <h1 className="picnic-404-title">The ants ran off with this page.</h1>
          <p className="picnic-404-line">
            Nothing here but crumbs. Let&apos;s get you back to the table.
          </p>
          <Link href="/" className="cta-primary mt-5">
            Back to Spread
          </Link>
        </div>
      </div>

      <div className="picnic-404-ants" aria-hidden="true">
        <div className="ant-parade">
          <Sticker name="ant" size="sm" tilt={-4} />
          <Sticker name="ant" size="sm" tilt={3} />
          <Sticker name="ticket" size="sm" tilt={-2} />
          <Sticker name="ant" size="sm" tilt={5} />
          <Sticker name="ant" size="sm" tilt={-3} />
        </div>
      </div>
    </main>
  );
}
