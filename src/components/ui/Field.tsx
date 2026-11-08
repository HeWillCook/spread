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
    <div className="flex flex-col gap-1">
      <label htmlFor={inputId} className="text-sm font-bold text-ink">
        {label}
      </label>
      <input
        id={inputId}
        aria-describedby={hintId}
        className={`min-h-12 rounded-xl border-2 border-ink bg-white px-4 py-2 text-base text-ink placeholder:text-ink/40 ${className}`}
        {...props}
      />
      {hint ? (
        <p id={hintId} className="text-xs text-ink/70">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
