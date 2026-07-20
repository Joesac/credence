import Database from 'better-sqlite3';
import { addColumnIfMissing } from './utils';
import { Migration } from './types';

const migrateWithdrawalsColumns: Migration = {
  id: '20240719_add_withdrawal_columns',
  description: 'Ensure withdrawals table has is_cancelled and date_updated columns',
  run: (db: Database.Database) => {
    addColumnIfMissing(db, 'withdrawals', 'is_cancelled', "is_cancelled INTEGER NOT NULL DEFAULT 0");
    addColumnIfMissing(
      db,
      'withdrawals',
      'date_updated',
      "date_updated TEXT NOT NULL DEFAULT (datetime('now'))"
    );
  },
};

export const MIGRATIONS: Migration[] = [migrateWithdrawalsColumns];
