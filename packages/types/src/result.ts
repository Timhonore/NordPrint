/**
 * Small result helper used across provider abstractions so that transport
 * failures are values, not thrown exceptions crossing module boundaries.
 */
export type Result<T, E = ProviderError> =
  { readonly ok: true; readonly value: T } | { readonly ok: false; readonly error: E };

export interface ProviderError {
  readonly code: string;
  readonly message: string;
  readonly retryable: boolean;
  readonly cause?: unknown;
}

export const ok = <T>(value: T): Result<T, never> => ({ ok: true, value });
export const err = <E>(error: E): Result<never, E> => ({ ok: false, error });
