import { timingSafeEqual } from 'node:crypto';
import type { MiddlewareHandler } from 'hono';

/**
 * Hono middleware that validates the Bearer API key against process.env.API_KEY.
 * Uses timingSafeEqual to prevent timing attacks on key comparison.
 *
 * Returns 401 with a structured error matching the IpcError shape from the desktop app.
 */
export const requireApiKey: MiddlewareHandler = async (c, next) => {
  const expectedKey = process.env.API_KEY;
  if (!expectedKey) {
    return c.json({
      code: 'API_KEY_NOT_CONFIGURED',
      message: 'Server API key is not configured.',
    }, 500);
  }

  const authHeader = c.req.header('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({
      code: 'UNAUTHORIZED',
      message: 'Missing or invalid Authorization header. Expected: Bearer <key>',
    }, 401);
  }

  const providedKey = authHeader.slice(7);
  const expectedBuffer = Buffer.from(expectedKey);
  const providedBuffer = Buffer.from(providedKey);

  if (expectedBuffer.length !== providedBuffer.length || !timingSafeEqual(expectedBuffer, providedBuffer)) {
    return c.json({ code: 'UNAUTHORIZED', message: 'Invalid API key.' }, 401);
  }

  await next();
};
