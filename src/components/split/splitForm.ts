export interface SplitFormState {
  error: string | null;
  /** Counts successful saves. */
  saves: number;
}

export const INITIAL_SPLIT_FORM_STATE: SplitFormState = { error: null, saves: 0 };

export type SplitFormAction = (
  prev: SplitFormState,
  formData: FormData,
) => Promise<SplitFormState>;

/** The cover box's text for a saved amount: 1250 -> "12.50"; nothing covered shows blank. */
export function coverToInput(cents: number): string {
  return cents === 0 ? "" : (cents / 100).toFixed(2);
}
