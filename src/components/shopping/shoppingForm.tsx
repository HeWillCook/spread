export interface ShoppingFormState {
  error: string | null;
  /** Counts successful saves. */
  saves: number;
}

export const INITIAL_SHOPPING_FORM_STATE: ShoppingFormState = { error: null, saves: 0 };

export type ShoppingFormAction = (
  prev: ShoppingFormState,
  formData: FormData,
) => Promise<ShoppingFormState>;

/** The price box's text for a saved amount: 4999 -> "49.99". */
export function centsToInput(cents: number | null): string {
  return cents === null ? "" : (cents / 100).toFixed(2);
}
