const SLICE =
  "M-11 2 L-11 -19 C-16 -20 -16.5 -30 -8 -31 C-3.5 -33 3.5 -33 8 -31 C16.5 -30 16 -20 11 -19 L11 2 Z";

/** The brand mark: three slices of toast fanned like bills, the front one buttered. */
export function BrandMark({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="-34 -36 68 38"
      aria-hidden="true"
      focusable="false"
      className={`h-[1.1em] w-auto shrink-0 ${className}`}
    >
      <defs>
        <clipPath id="brand-mark-base">
          <rect x="-40" y="-60" width="80" height="61" />
        </clipPath>
      </defs>
      <g stroke="var(--color-ketchup)" strokeWidth="2.4" strokeLinejoin="round">
        <g clipPath="url(#brand-mark-base)">
          <path d={SLICE} transform="rotate(-25 0 8)" fill="#f2c79a" />
          <path d={SLICE} transform="rotate(25 0 8)" fill="#f2c79a" />
          <path d={SLICE} transform="translate(0 -1)" fill="#fff3df" />
        </g>
        <path
          d="M-7.5 -25 C-3 -28 3 -26.5 7.5 -27.5 L7.5 -13 C5.5 -10.5 3.5 -15 1.5 -12 C-0.5 -9 -3 -14.5 -4.5 -11.5 C-5.5 -10 -7.5 -11.5 -7.5 -13 Z"
          fill="var(--color-mustard)"
          stroke="none"
        />
        <path d="M-15 0 H15" strokeWidth="2.8" strokeLinecap="round" />
      </g>
    </svg>
  );
}

export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span
      className={`wordmark inline-flex items-end gap-[0.15em] font-display text-[1.75rem] leading-none text-ketchup ${className}`}
    >
      <BrandMark />
      <span>
        <span>Spread</span>
        <span className="wordmark-dot">.</span>
      </span>
    </span>
  );
}
