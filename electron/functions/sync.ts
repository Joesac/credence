import Database from 'better-sqlite3';
import { USER_ROLES } from '../constants';
import { createAuditLog } from './audit';
import { createIpcError } from '../errors';
import { fetchUserById } from './users';
import { ClearSyncConfigPayload, SaveSyncConfigPayload } from '../types';

/**
 * Tables eligible for cloud sync, ordered by foreign-key dependency.
 * Parent tables must sync before child tables to satisfy FK constraints on the cloud DB.
 */
export const SYNCABLE_TABLES = [
  'users',
  'members',
  'deposits',
  'withdrawals',
  'loans',
  'loan_repayments',
  'fund_distributions',
] as const;

export type SyncableTable = (typeof SYNCABLE_TABLES)[number];

function isSyncableTable(table: string): table is SyncableTable {
  return (SYNCABLE_TABLES as readonly string[]).includes(table);
}

/**
 * Fetches all unsynced rows (is_synced = 0) from the given table.
 * Returns full row data including sensitive columns (e.g. password hashes)
 * since this data is only sent to the cloud API over HTTPS.
 */
export function getUnsyncedRows(
  db: Database.Database,
  payload: { table: string }
): Record<string, unknown>[] {
  if (!isSyncableTable(payload.table)) {
    throw new Error(`Table '${payload.table}' is not syncable`);
  }

  const stmt = db.prepare(`SELECT * FROM ${payload.table} WHERE is_synced = 0`);
  return stmt.all() as Record<string, unknown>[];
}

/**
 * Marks the given row IDs as synced (is_synced = 1) in the specified table.
 * Executed as a single transaction so a partial failure rolls back all marks.
 */
export function markRowsSynced(
  db: Database.Database,
  payload: { table: string; ids: string[] }
): { success: boolean } {
  if (!isSyncableTable(payload.table)) {
    throw new Error(`Table '${payload.table}' is not syncable`);
  }

  if (!payload.ids.length) {
    return { success: true };
  }

  const placeholders = payload.ids.map((_, i) => `@id${i}`).join(', ');
  const params: Record<string, unknown> = {};
  payload.ids.forEach((id, i) => {
    params[`id${i}`] = id;
  });

  const stmt = db.prepare(
    `UPDATE ${payload.table} SET is_synced = 1 WHERE id IN (${placeholders})`
  );

  const tx = db.transaction(() => stmt.run(params));
  tx();

  return { success: true };
}

/**
 * Returns a count of unsynced rows per table for all syncable tables.
 * Used by the Sync UI to show pending sync counts.
 */
export function getSyncStats(db: Database.Database): Record<string, number> {
  const stats: Record<string, number> = {};

  for (const table of SYNCABLE_TABLES) {
    const stmt = db.prepare(
      `SELECT COUNT(*) as count FROM ${table} WHERE is_synced = 0`
    );
    const result = stmt.get() as { count: number };
    stats[table] = result.count;
  }

  return stats;
}

/**
 * Reads a single setting value from the app_settings table.
 * Returns null when the key does not exist.
 */
export function getSetting(
  db: Database.Database,
  payload: { key: string }
): string | null {
  const stmt = db.prepare('SELECT value FROM app_settings WHERE key = @key LIMIT 1');
  const result = stmt.get({ key: payload.key }) as { value: string } | undefined;
  return result?.value ?? null;
}

/**
 * Upserts a setting value into the app_settings table.
 */
export function setSetting(
  db: Database.Database,
  payload: { key: string; value: string }
): { success: boolean } {
  const stmt = db.prepare(`
    INSERT INTO app_settings (key, value)
    VALUES (@key, @value)
    ON CONFLICT(key) DO UPDATE SET value = @value, date_updated = datetime('now')
  `);
  stmt.run({ key: payload.key, value: payload.value });
  return { success: true };
}

const SETTING_API_URL = 'api_base_url';
const SETTING_API_KEY = 'api_key';

export function saveSyncConfig(
  db: Database.Database,
  payload: SaveSyncConfigPayload
): { success: boolean } {
  const actor = fetchUserById(db, payload.actorId);
  if (!actor || actor.role !== USER_ROLES.Admin) {
    throw createIpcError('FORBIDDEN', 'Only administrators can save cloud sync configuration.');
  }

  setSetting(db, { key: SETTING_API_URL, value: payload.apiUrl });
  setSetting(db, { key: SETTING_API_KEY, value: payload.apiKey });

  createAuditLog(db, {
    actorId: payload.actorId,
    action: 'SYNC_CONFIG_SAVED',
    details: JSON.stringify({ api_url: payload.apiUrl }),
  });

  return { success: true };
}

export function clearSyncConfig(
  db: Database.Database,
  payload: ClearSyncConfigPayload
): { success: boolean } {
  const actor = fetchUserById(db, payload.actorId);
  if (!actor || actor.role !== USER_ROLES.Admin) {
    throw createIpcError('FORBIDDEN', 'Only administrators can clear cloud sync configuration.');
  }

  setSetting(db, { key: SETTING_API_URL, value: '' });
  setSetting(db, { key: SETTING_API_KEY, value: '' });

  createAuditLog(db, {
    actorId: payload.actorId,
    action: 'SYNC_CONFIG_CLEARED',
  });

  return { success: true };
}
