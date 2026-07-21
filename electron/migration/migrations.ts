import Database from 'better-sqlite3';
import { addColumnIfMissing, createUniqueIndexIfMissing } from './utils';
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

const addTransactionIdColumns: Migration = {
  id: '20240720_add_transaction_ids',
  description: 'Add transaction_id columns to deposits and withdrawals',
  run: (db: Database.Database) => {
    addColumnIfMissing(db, 'deposits', 'transaction_id', 'transaction_id TEXT');
    createUniqueIndexIfMissing(db, 'deposits', 'uniq_deposits_transaction_id', '(transaction_id)');

    addColumnIfMissing(db, 'withdrawals', 'transaction_id', 'transaction_id TEXT');
    createUniqueIndexIfMissing(db, 'withdrawals', 'uniq_withdrawals_transaction_id', '(transaction_id)');
  },
};

const addLoanCancellationColumn: Migration = {
  id: '20240721_add_loan_cancellation_column',
  description: 'Add is_cancelled column to loans table',
  run: (db: Database.Database) => {
    addColumnIfMissing(db, 'loans', 'is_cancelled', "is_cancelled INTEGER NOT NULL DEFAULT 0");
  },
};

const updateLoanRepaymentsSchema: Migration = {
  id: '20240721_update_loan_repayments_schema',
  description: 'Replace member_id with loan_id reference in loan repayments',
  run: (db: Database.Database) => {
    const columns = db.prepare("PRAGMA table_info('loan_repayments')").all() as { name: string }[];
    const hasLoanId = columns.some((column) => column.name === 'loan_id');
    if (hasLoanId) {
      return;
    }

    db.exec(`
      CREATE TABLE IF NOT EXISTS loan_repayments__new (
        id TEXT PRIMARY KEY,
        loan_id TEXT,
        receiver_id TEXT NOT NULL,
        amount REAL NOT NULL,
        notes TEXT,
        date_created TEXT NOT NULL DEFAULT (datetime('now')),
        is_synced INTEGER NOT NULL DEFAULT 0,
        FOREIGN KEY (loan_id) REFERENCES loans(id) ON UPDATE CASCADE ON DELETE CASCADE,
        FOREIGN KEY (receiver_id) REFERENCES users(id) ON UPDATE CASCADE ON DELETE CASCADE
      );
    `);

    db.exec(`
      INSERT INTO loan_repayments__new (id, loan_id, receiver_id, amount, notes, date_created, is_synced)
      SELECT id, NULL, receiver_id, amount, notes, date_created, is_synced
      FROM loan_repayments;
    `);

    db.exec('DROP TABLE loan_repayments');
    db.exec('ALTER TABLE loan_repayments__new RENAME TO loan_repayments');
  },
};

export const MIGRATIONS: Migration[] = [
  migrateWithdrawalsColumns,
  addTransactionIdColumns,
  addLoanCancellationColumn,
  updateLoanRepaymentsSchema,
];
