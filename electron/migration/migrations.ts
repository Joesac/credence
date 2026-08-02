import Database from 'better-sqlite3';
import { addColumnIfMissing, createUniqueIndexIfMissing } from './utils';
import { Migration } from './types';

const migrateWithdrawalsColumns: Migration = {
  id: '20260719_add_withdrawal_columns',
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
  id: '20260720_add_transaction_ids',
  description: 'Add transaction_id columns to deposits and withdrawals',
  run: (db: Database.Database) => {
    addColumnIfMissing(db, 'deposits', 'transaction_id', 'transaction_id TEXT');
    createUniqueIndexIfMissing(db, 'deposits', 'uniq_deposits_transaction_id', '(transaction_id)');

    addColumnIfMissing(db, 'withdrawals', 'transaction_id', 'transaction_id TEXT');
    createUniqueIndexIfMissing(db, 'withdrawals', 'uniq_withdrawals_transaction_id', '(transaction_id)');
  },
};

const addLoanCancellationColumn: Migration = {
  id: '20260721_add_loan_cancellation_column',
  description: 'Add is_cancelled column to loans table',
  run: (db: Database.Database) => {
    addColumnIfMissing(db, 'loans', 'is_cancelled', "is_cancelled INTEGER NOT NULL DEFAULT 0");
  },
};

const updateLoanRepaymentsSchema: Migration = {
  id: '20260721_update_loan_repayments_schema',
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

const addLoanRepaymentCancellationColumn: Migration = {
  id: '20260722_add_loan_repayment_cancellation_column',
  description: 'Add is_cancelled column to loan_repayments table',
  run: (db: Database.Database) => {
    addColumnIfMissing(db, 'loan_repayments', 'is_cancelled', 'is_cancelled INTEGER NOT NULL DEFAULT 0');
  },
};

const addDepositRefreshmentTokenColumn: Migration = {
  id: '20260725_add_deposit_refreshment_token_column',
  description: 'Add refreshment_token column to deposits table',
  run: (db: Database.Database) => {
    addColumnIfMissing(db, 'deposits', 'refreshment_token', 'refreshment_token INTEGER NOT NULL DEFAULT 0');
  },
};

const addMemberIsDisabledColumn: Migration = {
  id: '20260726_add_member_is_disabled_column',
  description: 'Add is_disabled column to members table',
  run: (db: Database.Database) => {
    addColumnIfMissing(db, 'members', 'is_disabled', 'is_disabled INTEGER NOT NULL DEFAULT 0');
  },
};

const addUsersUsernameColumn: Migration = {
  id: '20260726_add_users_username_column',
  description: 'Add username column to users table for legacy databases',
  run: (db: Database.Database) => {
    addColumnIfMissing(db, 'users', 'username', "username TEXT NOT NULL DEFAULT ''");
  },
};

const addUsersStatusAndLoginColumns: Migration = {
  id: '20260726_add_users_status_and_login_columns',
  description: 'Add is_disabled and last_login columns to users table',
  run: (db: Database.Database) => {
    addColumnIfMissing(db, 'users', 'is_disabled', 'is_disabled INTEGER NOT NULL DEFAULT 0');
    addColumnIfMissing(db, 'users', 'last_login', 'last_login TEXT');
  },
};

const makeUsersUsernameUnique: Migration = {
  id: '20260727_make_users_username_unique',
  description: 'Add unique index to username column in users table',
  run: (db: Database.Database) => {
    createUniqueIndexIfMissing(db, 'users', 'uniq_users_username', '(username)');
  },
};

const addLoanDateUpdatedColumn: Migration = {
  id: '20260801_add_loan_date_updated_column',
  description: 'Add date_updated column to loans table and backfill from date_created',
  run: (db: Database.Database) => {
    addColumnIfMissing(
      db,
      'loans',
      'date_updated',
      "date_updated TEXT NOT NULL DEFAULT (datetime('now'))"
    );
    // Backfill existing rows: set date_updated to date_created
    db.exec("UPDATE loans SET date_updated = date_created WHERE date_updated IS NULL OR date_updated = ''");
  },
};

export const MIGRATIONS: Migration[] = [
  migrateWithdrawalsColumns,
  addTransactionIdColumns,
  addLoanCancellationColumn,
  updateLoanRepaymentsSchema,
  addLoanRepaymentCancellationColumn,
  addDepositRefreshmentTokenColumn,
  addMemberIsDisabledColumn,
  addUsersUsernameColumn,
  addUsersStatusAndLoginColumns,
  makeUsersUsernameUnique,
  addLoanDateUpdatedColumn,
];
