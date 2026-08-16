import { randomBytes, scryptSync, timingSafeEqual } from 'crypto';

/**
 * Combines a calendar date with a time to produce a SQLite-friendly datetime string.
 * @param date - ISO date string (YYYY-MM-DD) or ISO datetime string.
 * @param time - Optional time string (HH:mm:ss). Defaults to the current wall-clock time.
 * @returns Combined timestamp in the format `YYYY-MM-DD HH:mm:ss`.
 */
export function buildTransactionTimestamp(date: string, time?: string): string {
  const datePart = date.split('T')[0];
  const timePart = time ?? new Date().toTimeString().slice(0, 8);
  return `${datePart} ${timePart}`;
}

/**
 * Hashes a raw password using scrypt with a random salt.
 * Returns a string in the format `salt:hash` for storage.
 */
export function hashPassword(raw: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(raw, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

/**
 * Verifies a raw password against a stored `salt:hash` string.
 * Uses timingSafeEqual to prevent timing attacks.
 */
export function verifyPassword(raw: string, stored: string): boolean {
  const [salt, hash] = stored.split(':');
  if (!salt || !hash) return false;
  const derived = scryptSync(raw, salt, 64);
  const storedBuffer = Buffer.from(hash, 'hex');
  if (storedBuffer.length !== derived.length) return false;
  return timingSafeEqual(storedBuffer, derived);
}
