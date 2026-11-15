import type { ButtonHTMLAttributes } from "react";

const variants = {
  red: "bg-ketchup text-paper shadow-[inset_0_-3px_0_rgb(0_0_0/0.18)] hover:bg-ketchup-deep",
  mustard: "bg-mustard text-ink shadow-[inset_0_-3px_0_rgb(0_0_0/0.12)] hover:bg-mustard-deep",
  outline:
    "border-[1.5px] border-ink/70 bg-paper text-ink hover:border-ink hover:bg-cream/40",
} as const;

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
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
      className={`inline-flex min-h-11 items-center justify-center rounded-xl px-5 py-2.5 text-base font-semibold tracking-[0.005em] transition-[background-color,border-color,transform] active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${className}`}
      {...props}
    />
  );
}
