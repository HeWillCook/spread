export interface MenuFormState {
  error: string | null;
  /** Counts successful saves, so a form can reset itself after one. */
  saves: number;
  /** Set when a dish was just added, so the picker can announce and reveal it. */
  added?: { dishId: string; name: string };
}

export const INITIAL_MENU_FORM_STATE: MenuFormState = { error: null, saves: 0 };

export type MenuFormAction = (prev: MenuFormState, formData: FormData) => Promise<MenuFormState>;

export function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p
      role="alert"
      className="rounded-xl bg-ketchup px-4 py-3 text-sm font-bold text-paper"
    >
      {message}
    </p>
  );
}

export function FormStatus({ message }: { message: string | null }) {
  return (
    <p role="status" aria-live="polite" className="min-h-5 text-sm font-bold text-pickle">
      {message}
    </p>
  );
}
