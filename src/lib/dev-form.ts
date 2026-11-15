export interface DevFormState {
  error: string | null;
  message: string | null;
}

export const INITIAL_DEV_FORM_STATE: DevFormState = { error: null, message: null };
