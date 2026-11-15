import { useId, type InputHTMLAttributes } from "react";

export type FieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  hint?: string;
};

export function Field({ label, hint, id, className = "", ...props }: FieldProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const hintId = hint ? `${inputId}-hint` : undefined;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={inputId} className="text-sm font-bold text-ink">
        {label}
      </label>
      <input
        id={inputId}
        aria-describedby={hintId}
        className={`min-h-11 rounded-xl border-[1.5px] border-ink/35 bg-white px-3.5 py-2.5 text-base text-ink transition-colors placeholder:text-ink-muted hover:border-ink/60 focus:border-ink disabled:cursor-not-allowed disabled:bg-cream/60 disabled:opacity-70 ${className}`}
        {...props}
      />
      {hint ? (
        <p id={hintId} className="text-xs leading-relaxed text-ink-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
