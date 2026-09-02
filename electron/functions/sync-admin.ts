import Database from 'better-sqlite3';
import { createAuditLog } from './audit';
import { createIpcError } from '../errors';
import { hashPassword, verifyPassword } from './utils';
import { fetchUserById } from './users';
import { USER_ROLES } from '../constants';
import { SetSyncAdminPasswordPayload } from '../types';

export const SYNC_ADMIN_PASSWORD_KEY = 'sync_admin_password_hash';

function getStoredHash(db: Database.Database): string | null {
  const stmt = db.prepare(`SELECT value FROM app_settings WHERE key = @key LIMIT 1`);
  const record = stmt.get({ key: SYNC_ADMIN_PASSWORD_KEY }) as { value: string } | undefined;
  return record?.value ?? null;
}

export function getSyncAdminPasswordStatus(db: Database.Database): { isSet: boolean } {
  const hash = getStoredHash(db);
  return { isSet: !!hash };
}

export function verifySyncAdminPassword(db: Database.Database, password: string): { valid: boolean } {
  const hash = getStoredHash(db);
  if (!hash) {
    return { valid: false };
  }
  return { valid: verifyPassword(password, hash) };
}

export function setSyncAdminPassword(db: Database.Database, payload: SetSyncAdminPasswordPayload) {
  const actor = fetchUserById(db, payload.actorId);
  if (!actor || actor.role !== USER_ROLES.Admin) {
    throw createIpcError('FORBIDDEN', 'Only administrators can manage the cloud sync password.');
  }

  const existingHash = getStoredHash(db);
  const isInitial = !existingHash;

  if (existingHash && (!payload.currentPassword || !verifyPassword(payload.currentPassword, existingHash))) {
    throw createIpcError('INVALID_SYNC_PASSWORD', 'The current cloud sync password is incorrect.');
  }

  const update = db.prepare(`
    INSERT INTO app_settings (key, value, is_synced, date_updated)
    VALUES (@key, @value, 0, datetime('now'))
    ON CONFLICT(key) DO UPDATE SET
      value = @value,
      is_synced = 0,
      date_updated = datetime('now')
  `);
  update.run({
    key: SYNC_ADMIN_PASSWORD_KEY,
    value: hashPassword(payload.newPassword),
  });

  createAuditLog(db, {
    actorId: payload.actorId,
    action: isInitial ? 'SYNC_PASSWORD_SET' : 'SYNC_PASSWORD_CHANGED',
  });

  return { success: true };
}
