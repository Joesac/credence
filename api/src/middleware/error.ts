import type { Request, Response, NextFunction } from 'express';

/**
 * Express error-handling middleware.
 * Mirrors the IpcError shape { code, message, details? } from the desktop app
 * so the Angular client can handle errors consistently across IPC and HTTP.
 */
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof Error) {
    const code = (err as { code?: string }).code ?? 'INTERNAL_ERROR';
    const details = (err as { details?: unknown }).details;
    console.error(`[API Error] ${code}: ${err.message}`, details ?? '');
    res.status(500).json({ code, message: err.message, details });
    return;
  }

  res.status(500).json({ code: 'INTERNAL_ERROR', message: 'An unexpected error occurred.' });
}
