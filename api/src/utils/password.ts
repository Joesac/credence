import { scryptSync, randomBytes, timingSafeEqual } from 'crypto';

/**
 * Hashes a raw password using scrypt and returns a `salt:hash` string.
 * Mirrors the desktop app's electron/functions/utils.ts hashPassword.
 */
export function hashPassword(raw: string): string {
  const salt = randomBytes(16).toString('hex');
  const derived = scryptSync(raw, salt, 64);
  return `${salt}:${derived.toString('hex')}`;
}

/**
 * Verifies a raw password against a stored `salt:hash` string.
 * Mirrors the desktop app's electron/functions/utils.ts verifyPassword.
 * Uses scryptSync + timingSafeEqual to prevent timing attacks.
 */
export function verifyPassword(raw: string, stored: string): boolean {
  const [salt, hash] = stored.split(':');
  if (!salt || !hash) return false;
  const derived = scryptSync(raw, salt, 64);
  const storedBuffer = Buffer.from(hash, 'hex');
  if (storedBuffer.length !== derived.length) return false;
  return timingSafeEqual(storedBuffer, derived);
}
