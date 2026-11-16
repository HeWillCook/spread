import type { ComponentPropsWithRef } from "react";

const variants = {
  red: "fire-button bg-ketchup text-paper hover:bg-ketchup-deep",
  mustard: "bg-mustard text-ink shadow-[inset_0_-3px_0_rgb(0_0_0/0.12)] hover:bg-mustard-deep",
  outline:
    "border-[1.5px] border-ink/70 bg-paper text-ink hover:border-ink hover:bg-cream/40",
  danger:
    "border-[1.5px] border-ketchup bg-paper text-ketchup hover:border-ketchup-deep hover:bg-ketchup/5 hover:text-ketchup-deep",
} as const;

export type ButtonProps = ComponentPropsWithRef<"button"> & {
  variant: keyof typeof variants;
};

export function Button({
  variant,
  type = "button",
  className = "",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={`ui-button inline-flex min-h-11 items-center justify-center rounded-xl px-5 py-2.5 text-base font-semibold tracking-[0.005em] active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${className}`}
      {...props}
    />
  );
}
