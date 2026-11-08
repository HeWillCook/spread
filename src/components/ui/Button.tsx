import type { ButtonHTMLAttributes } from "react";

const variants = {
  red: "bg-ketchup text-cream",
  mustard: "bg-mustard text-ink",
  outline: "bg-white text-ink",
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
      className={`min-h-12 rounded-xl border-2 border-ink px-5 py-3 text-base font-bold transition-transform active:translate-y-px disabled:opacity-50 ${variants[variant]} ${className}`}
      {...props}
    />
  );
}
