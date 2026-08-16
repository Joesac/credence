import { timingSafeEqual } from 'crypto';
import type { Request, Response, NextFunction } from 'express';

/**
 * Express middleware that validates the Bearer API key against process.env.API_KEY.
 * Uses timingSafeEqual to prevent timing attacks on key comparison.
 *
 * Returns 401 with a structured error matching the IpcError shape from the desktop app.
 */
export function requireApiKey(req: Request, res: Response, next: NextFunction): void {
  const expectedKey = process.env.API_KEY;
  if (!expectedKey) {
    res.status(500).json({
      code: 'API_KEY_NOT_CONFIGURED',
      message: 'Server API key is not configured.',
    });
    return;
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      code: 'UNAUTHORIZED',
      message: 'Missing or invalid Authorization header. Expected: Bearer <key>',
    });
    return;
  }

  const providedKey = authHeader.slice(7);
  const expectedBuffer = Buffer.from(expectedKey);
  const providedBuffer = Buffer.from(providedKey);

  if (expectedBuffer.length !== providedBuffer.length || !timingSafeEqual(expectedBuffer, providedBuffer)) {
    res.status(401).json({
      code: 'UNAUTHORIZED',
      message: 'Invalid API key.',
    });
    return;
  }

  next();
}
