const SIZES = {
  sm: "h-[0.95rem] w-[0.8rem]",
  md: "h-5 w-[1.05rem]",
  lg: "h-6 w-5",
} as const;

/** A small layered flame for the wordmark and other quiet success moments. */
export function FlameIcon({
  size = "sm",
  className = "",
}: {
  size?: keyof typeof SIZES;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 20 26"
      aria-hidden="true"
      focusable="false"
      className={`flame-icon ${SIZES[size]} ${className}`}
    >
      <path
        d="M10 26C4.8 26 1.2 22.2 1.2 17.7C1.2 14.2 3 11.4 4.5 8.8C6 6.2 6.5 3.4 5.9 1C8.8 3 10.4 6.2 10.8 9.4C11.3 8.2 11.7 6.7 11.8 5.2C14 8 16.7 11.7 16.7 16.5C16.7 22.4 13.6 26 10 26Z"
        fill="var(--ember)"
      />
      <path
        d="M10 26C6.5 26 4.2 23.4 4.2 20.2C4.2 17.8 5.4 16.1 6.5 14.4C7.6 12.7 8 10.5 7.7 8.1C9.6 9.6 10.7 12 10.9 14.2C11.3 13.4 11.5 12.3 11.6 11.1C13 13.1 13.9 15.5 13.9 18.1C13.9 22.1 12.1 26 10 26Z"
        fill="var(--flame)"
      />
      <path
        d="M10 24.4C8.2 24.4 7 22.9 7 21.1C7 19.6 7.8 18.5 8.4 17.4C9 16.4 9.2 15 9 13.6C10.2 14.5 10.9 15.9 11 17.2C11.2 16.7 11.4 16 11.5 15.3C12.3 16.5 12.8 17.9 12.8 19.4C12.8 22 11.9 24.4 10 24.4Z"
        fill="var(--flame-tip)"
      />
    </svg>
  );
}
