import { describe, expect, it } from 'vitest';
import { hashPassword, verifyPassword } from './password';

describe('password utils (async scrypt)', () => {
  it('hashes a password and verifies it correctly', async () => {
    const hash = await hashPassword('mySecret123');
    expect(hash).toContain(':');
    const [salt, derived] = hash.split(':');
    expect(salt).toHaveLength(32); // 16 bytes hex
    expect(derived).toHaveLength(128); // 64 bytes hex

    const valid = await verifyPassword('mySecret123', hash);
    expect(valid).toBe(true);
  });

  it('rejects an incorrect password', async () => {
    const hash = await hashPassword('correctPassword');
    const valid = await verifyPassword('wrongPassword', hash);
    expect(valid).toBe(false);
  });

  it('produces different salts for the same password', async () => {
    const hash1 = await hashPassword('samePassword');
    const hash2 = await hashPassword('samePassword');
    expect(hash1).not.toBe(hash2);
    expect(await verifyPassword('samePassword', hash1)).toBe(true);
    expect(await verifyPassword('samePassword', hash2)).toBe(true);
  });

  it('rejects a malformed stored hash', async () => {
    expect(await verifyPassword('anything', 'not-a-hash')).toBe(false);
    expect(await verifyPassword('anything', '')).toBe(false);
    expect(await verifyPassword('anything', 'onlysalt')).toBe(false);
  });
});
