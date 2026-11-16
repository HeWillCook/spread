import type { Cover } from "@/lib/cover";
import { GrillMarks } from "./fire/GrillMarks";

const sizes = {
  sm: "h-8 w-8 text-base",
  md: "h-10 w-10 text-xl",
  lg: "h-14 w-14 text-3xl",
} as const;

/** A preset emoji on its palette colour: the event's small cover badge. */
export function CoverChip({
  cover,
  size = "md",
  marks = false,
  className = "",
}: {
  cover: Cover;
  size?: keyof typeof sizes;
  /** A quiet seared texture, used on the event masthead. */
  marks?: boolean;
  className?: string;
}) {
  return (
    <span
      role="img"
      aria-label={`Cover: ${cover.emojiLabel}`}
      data-cover={cover.color}
      className={`relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full ring-1 ring-inset ring-ink/10 ${sizes[size]} ${cover.className} ${className}`}
    >
      {marks ? <GrillMarks variant="sear" /> : null}
      <span aria-hidden className="relative">
        {cover.emoji}
      </span>
    </span>
  );
}
