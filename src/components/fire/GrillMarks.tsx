/**
 * A quiet seared texture: diagonal grate stripes for cover chips, stamps and
 * empty-state art. Position the parent; the marks fill it. `sear` keeps three
 * wide stripes for a small badge; `texture` repeats for larger surfaces.
 */
export function GrillMarks({
  variant = "texture",
  className = "",
}: {
  variant?: "texture" | "sear";
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={`grill-marks ${variant === "sear" ? "grill-marks-sear" : ""} ${className}`}
    />
  );
}
