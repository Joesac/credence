import { scrypt, randomBytes, timingSafeEqual } from 'crypto';
import { promisify } from 'util';

const scryptAsync = promisify(scrypt) as (
  password: string | Buffer,
  salt: string | Buffer,
  keylen: number,
) => Promise<Buffer>;

/**
 * Hashes a raw password using scrypt and returns a `salt:hash` string.
 * Mirrors the desktop app's electron/functions/utils.ts hashPassword.
 *
 * Uses the async scrypt to avoid blocking the Workers event loop.
 */
export async function hashPassword(raw: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const derived = await scryptAsync(raw, salt, 64);
  return `${salt}:${derived.toString('hex')}`;
}

/**
 * Verifies a raw password against a stored `salt:hash` string.
 * Mirrors the desktop app's electron/functions/utils.ts verifyPassword.
 * Uses async scrypt + timingSafeEqual to prevent timing attacks.
 */
export async function verifyPassword(raw: string, stored: string): Promise<boolean> {
  const [salt, hash] = stored.split(':');
  if (!salt || !hash) return false;
  const derived = await scryptAsync(raw, salt, 64);
  const storedBuffer = Buffer.from(hash, 'hex');
  if (storedBuffer.length !== derived.length) return false;
  return timingSafeEqual(storedBuffer, derived);
}
