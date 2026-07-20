import type { SerializedError } from './types';

/**
 * Canonical error representation sent to the renderer. The renderer never sees
 * raw Error instances from the main process, so we normalize the shape here.
 */
export type SerializedIpcError = SerializedError;

const INTERNAL_ERROR_CODE = 'INTERNAL_ERROR';
const INTERNAL_ERROR_MESSAGE = 'Unable to complete the requested action.';

/**
 * Error type dedicated to IPC boundaries. The `code` property enables the
 * renderer to branch on well-known failure states without parsing strings.
 */
export class IpcError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = 'IpcError';
  }
}

/**
 * Convenience factory for creating typed IPC errors.
 */
export function createIpcError(
  code: string,
  message: string,
  details?: unknown
): IpcError {
  return new IpcError(code, message, details);
}

/**
 * Reduces any thrown value to a `SerializedIpcError` so we never leak
 * stack traces or native error instances to the renderer.
 */
export function serializeError(error: unknown): SerializedIpcError {
  if (error instanceof IpcError) {
    return {
      code: error.code,
      message: error.message,
      details: error.details,
    };
  }

  if (typeof error === 'object' && error !== null) {
    const code = 'code' in error && error.code
      ? String((error as { code: unknown }).code)
      : INTERNAL_ERROR_CODE;

    const message = 'message' in error && error.message
      ? String((error as { message: unknown }).message)
      : INTERNAL_ERROR_MESSAGE;

    const details = 'details' in error ? (error as { details?: unknown }).details : undefined;

    return { code, message, details };
  }

  return { code: INTERNAL_ERROR_CODE, message: INTERNAL_ERROR_MESSAGE };
}

/**
 * Converts a serialized error into an actual Error instance enriched with
 * metadata so Electron forwards both the message and the structured fields.
 */
export function toRendererSafeError(error: unknown): Error & SerializedIpcError {
  const serialized = serializeError(error);
  const enriched = Object.assign(new Error(serialized.message), serialized);
  // Preserve the structured payload for anyone reading `cause` downstream.
  (enriched as { cause?: SerializedIpcError }).cause = serialized;
  return enriched;
}
