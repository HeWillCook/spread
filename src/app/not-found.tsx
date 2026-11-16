import Link from "next/link";
import { Embers } from "@/components/fire/Embers";
import { Flames } from "@/components/fire/Flames";
import { Wordmark } from "@/components/ui/Wordmark";

export default function NotFound() {
  return (
    <main className="grill-404">
      <Embers count={54} rise={860} />

      <div className="grill-404-inner">
        <Link href="/" aria-label="Spread home" className="wordmark-link">
          <Wordmark />
        </Link>

        <div className="grill-404-scene" aria-hidden="true">
          <Flames edge="bottom" size="lg" />
          <svg
            className="grill-404-grate"
            viewBox="0 0 320 200"
            aria-hidden="true"
            focusable="false"
          >
            <g
              fill="none"
              stroke="currentColor"
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="40" y="58" width="240" height="112" rx="10" />
              <path d="M64 72v84M88 72v84M112 72v84M136 72v84M160 72v84M184 72v84M208 72v84M232 72v84M256 72v84" />
              <path d="M40 114H22M280 114h18" />
            </g>
          </svg>
        </div>

        <h1 className="grill-404-title">This one fell through the grate.</h1>
        <p className="grill-404-line">
          The page you were after is off the menu. Head back to the grill and
          start again.
        </p>
        <Link href="/" className="cta-primary">
          Back to Spread
        </Link>
      </div>
    </main>
  );
}
