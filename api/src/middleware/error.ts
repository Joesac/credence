import type { ErrorHandler } from 'hono';

/**
 * Hono error handler (app.onError).
 * Mirrors the IpcError shape { code, message, details? } from the desktop app
 * so the Angular client can handle errors consistently across IPC and HTTP.
 */
export const errorHandler: ErrorHandler = (err, c) => {
  if (err instanceof Error) {
    const code = (err as { code?: string }).code ?? 'INTERNAL_ERROR';
    const details = (err as { details?: unknown }).details;
    console.error(`[API Error] ${code}: ${err.message}`, details ?? '');
    return c.json({ code, message: err.message, details }, 500);
  }

  return c.json({ code: 'INTERNAL_ERROR', message: 'An unexpected error occurred.' }, 500);
};
