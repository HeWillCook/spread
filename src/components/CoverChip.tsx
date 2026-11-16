import type { Cover } from "@/lib/cover";

const sizes = {
  sm: "h-8 w-8 text-base",
  md: "h-10 w-10 text-xl",
  lg: "h-14 w-14 text-3xl",
} as const;

/** A preset emoji on its palette colour: the event's small cover badge. */
export function CoverChip({
  cover,
  size = "md",
  className = "",
}: {
  cover: Cover;
  size?: keyof typeof sizes;
  className?: string;
}) {
  return (
    <span
      role="img"
      aria-label={`Cover: ${cover.emojiLabel}`}
      className={`inline-flex shrink-0 items-center justify-center rounded-full ring-1 ring-inset ring-ink/10 ${sizes[size]} ${cover.className} ${className}`}
    >
      <span aria-hidden>{cover.emoji}</span>
    </span>
  );
}
