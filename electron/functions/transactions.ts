import Database from 'better-sqlite3';
import { randomUUID } from 'crypto';
import { DEPOSIT_BASE_COLUMNS } from '../constants';
import {
  CreateDepositPayload,
  DailySummary,
  DbDepositRow,
  DeleteDepositPayload,
  DepositQueryOptions,
  MemberFinancialSummary,
  MemberFinancialSummaryPayload,
  PaginatedResponse,
  SanitizedDeposit,
  CreateWithdrawalPayload,
  DbWithdrawalRow,
  DeleteWithdrawalPayload,
  UpdateDepositPayload,
  SanitizedWithdrawal,
  UpdateWithdrawalPayload,
  WithdrawalQueryOptions,
} from '../types';
import { WITHDRAWAL_BASE_COLUMNS } from '../constants';
import { createIpcError } from '../errors';
import { buildTransactionTimestamp } from './utils';

function prefixColumns(columns: string, alias: string): string {
  return columns.trim().split(',').map(c => `${alias}.${c.trim()}`).join(', ');
}

const DEPOSIT_COLUMNS = prefixColumns(DEPOSIT_BASE_COLUMNS, 'd');
const WITHDRAWAL_COLUMNS = prefixColumns(WITHDRAWAL_BASE_COLUMNS, 'w');

type TransactionTable = 'deposits' | 'withdrawals';
type TransactionPrefix = 'DEP' | 'WDR';

function formatDateStamp(): string {
  const isoDate = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  return isoDate.replace(/-/g, '');
}

function generateTransactionId(
  db: Database.Database,
  table: TransactionTable,
  prefix: TransactionPrefix
): string {
  const dateStamp = formatDateStamp();
  const likePattern = `${prefix}-${dateStamp}-%`;
  const stmt = db.prepare<{ pattern: string }>(`
    SELECT transaction_id
    FROM ${table}
    WHERE transaction_id LIKE @pattern
    ORDER BY transaction_id DESC
    LIMIT 1
  `);
  const existing = stmt.get({ pattern: likePattern }) as { transaction_id?: string } | undefined;
  const lastCounter = existing?.transaction_id
    ? Number(existing.transaction_id.split('-').pop())
    : NaN;
  const nextCounter = Number.isFinite(lastCounter) ? (lastCounter as number) + 1 : 1;
  const suffix = String(nextCounter).padStart(4, '0');
  return `${prefix}-${dateStamp}-${suffix}`;
}

/**
 * Normalizes deposit rows to the sanitized variant consumed by IPC responders.
 */
function sanitizeDeposit(row: DbDepositRow): SanitizedDeposit {
  return { 
    ...row, 
    member_name: row.member_name ?? 'Unknown',
    received_by_name: row.received_by_name ?? 'Unknown'
  };
}

/**
 * Inserts a deposit record while letting SQLite manage timestamps and sync flags.
 */
export function createDeposit(db: Database.Database, payload: CreateDepositPayload) {
  const id = randomUUID();
  const transactionId = generateTransactionId(db, 'deposits', 'DEP');
  const timestamp = buildTransactionTimestamp(payload.date);
  const stmt = db.prepare(`
    INSERT INTO deposits (id, transaction_id, member_id, received_by, payment_method, amount, refreshment_token, notes, date_created, date_updated)
    VALUES (@id, @transaction_id, @member_id, @received_by, @payment_method, @amount, @refreshment_token, @notes, @date_created, @date_updated)
  `);

  stmt.run({
    id,
    transaction_id: transactionId,
    member_id: payload.memberId,
    received_by: payload.receivedBy,
    payment_method: payload.paymentMethod,
    amount: payload.amount,
    refreshment_token: payload.refreshmentToken,
    notes: payload.notes ?? null,
    date_created: timestamp,
    date_updated: timestamp,
  });

  return fetchDepositById(db, id);
}

/**
 * Retrieves paginated deposits with optional per-member filtering and cancelled toggles.
 */
export function fetchDeposits(
  db: Database.Database,
  options: DepositQueryOptions = { page: 1, pageSize: 10 }
): PaginatedResponse<SanitizedDeposit> {
  const page = Math.max(1, Math.floor(options.page ?? 1));
  const pageSize = Math.max(1, Math.floor(options.pageSize ?? 10));
  const offset = (page - 1) * pageSize;
  const includeCancelled = Boolean(options.includeCancelled);
  const filters: string[] = [];
  const params: Record<string, unknown> = {};

  if (!includeCancelled) {
    filters.push('d.is_cancelled = 0');
  }

  if (options.memberId) {
    filters.push('d.member_id = @member_id');
    params.member_id = options.memberId;
  }

  if (options.date) {
    filters.push('date(d.date_created) = @date');
    params.date = options.date;
  }

  const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : '';

  const countStmt = db.prepare(`
    SELECT COUNT(*) as total
    FROM deposits d
    ${whereClause}
  `);
  const totalRecords = (countStmt.get(params) as { total: number }).total;

  const listStmt = db.prepare(`
    SELECT ${DEPOSIT_COLUMNS}, m.fullname as member_name, u.fullname as received_by_name
    FROM deposits d
    LEFT JOIN members m ON d.member_id = m.id
    LEFT JOIN users u ON d.received_by = u.id
    ${whereClause}
    ORDER BY datetime(d.date_created) DESC
    LIMIT @limit OFFSET @offset
  `);

  const rows = (listStmt.all({ ...params, limit: pageSize, offset }) as DbDepositRow[]).map(
    sanitizeDeposit
  );
  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));

  return {
    data: rows,
    pagination: {
      page,
      pageSize,
      totalRecords,
      totalPages,
    },
  };
}

/**
 * Fetches a single deposit so callers always receive fresh state after mutations.
 */
export function fetchDepositById(db: Database.Database, id: string) {
  const stmt = db.prepare(`
    SELECT ${DEPOSIT_COLUMNS}, m.fullname as member_name, u.fullname as received_by_name
    FROM deposits d
    LEFT JOIN members m ON d.member_id = m.id
    LEFT JOIN users u ON d.received_by = u.id
    WHERE d.id = @id
    LIMIT 1
  `);
  const record = stmt.get({ id }) as DbDepositRow | undefined;
  return record ? sanitizeDeposit(record) : null;
}

/**
 * Applies partial updates to deposit rows while refreshing the modification timestamp.
 */
export function updateDeposit(db: Database.Database, payload: UpdateDepositPayload) {
  const fields: string[] = [];
  const params: Record<string, unknown> = { id: payload.id };

  if (payload.memberId !== undefined) {
    fields.push('member_id = @member_id');
    params.member_id = payload.memberId;
  }
  if (payload.receivedBy !== undefined) {
    fields.push('received_by = @received_by');
    params.received_by = payload.receivedBy;
  }
  if (payload.paymentMethod !== undefined) {
    fields.push('payment_method = @payment_method');
    params.payment_method = payload.paymentMethod;
  }
  if (payload.amount !== undefined) {
    fields.push('amount = @amount');
    params.amount = payload.amount;
  }
  if (payload.refreshmentToken !== undefined) {
    fields.push('refreshment_token = @refreshment_token');
    params.refreshment_token = payload.refreshmentToken;
  }
  if (payload.notes !== undefined) {
    fields.push('notes = @notes');
    params.notes = payload.notes ?? null;
  }

  if (!fields.length) {
    return fetchDepositById(db, payload.id);
  }

  const stmt = db.prepare(`
    UPDATE deposits
    SET ${fields.join(', ')}, date_updated = datetime('now')
    WHERE id = @id
  `);
  const result = stmt.run(params);
  if (result.changes === 0) {
    return null;
  }
  return fetchDepositById(db, payload.id);
}

/**
 * Soft-deletes deposits by setting the cancelled flag instead of removing historical data.
 */
export function deleteDeposit(db: Database.Database, payload: DeleteDepositPayload) {
  const stmt = db.prepare(`
    UPDATE deposits
    SET is_cancelled = 1, date_updated = datetime('now')
    WHERE id = @id AND is_cancelled = 0
  `);
  const result = stmt.run({ id: payload.id });
  return { success: result.changes > 0 } as const;
}

/**
 * Aggregates deposit and withdrawal totals for a member to support balance-sensitive flows.
 */
export function fetchMemberFinancialSummary(
  db: Database.Database,
  payload: MemberFinancialSummaryPayload
): MemberFinancialSummary {
  const stmt = db.prepare(`
    SELECT
      (
        SELECT IFNULL(SUM(amount), 0)
        FROM deposits
        WHERE member_id = @member_id AND is_cancelled = 0
      ) AS totalDeposits,
      (
        SELECT IFNULL(SUM(amount), 0)
        FROM withdrawals
        WHERE member_id = @member_id AND is_cancelled = 0
      ) AS totalWithdrawals
  `);

  const result = stmt.get({ member_id: payload.memberId }) as
    | { totalDeposits: number; totalWithdrawals: number }
    | undefined;

  const totalDeposits = result?.totalDeposits ?? 0;
  const totalWithdrawals = result?.totalWithdrawals ?? 0;

  return {
    totalDeposits,
    totalWithdrawals,
    availableBalance: totalDeposits - totalWithdrawals,
  };
}

/**
 * Normalizes raw withdrawal rows into the sanitized shape consumed by IPC responders.
 */
function sanitizeWithdrawal(row: DbWithdrawalRow): SanitizedWithdrawal {
  return { 
    ...row, 
    member_name: row.member_name ?? 'Unknown',
    issuer_name: row.issuer_name ?? 'Unknown'
  };
}

/**
 * Records a withdrawal after verifying the member has enough net deposits (deposits - withdrawals).
 * Throws a descriptive error to keep renderer logic simple when balances are insufficient.
 */
export function createWithdrawal(db: Database.Database, payload: CreateWithdrawalPayload) {
  // Enforce that withdrawals never exceed net deposits (deposits - withdrawals).
  const totalDepositsStmt = db.prepare(`
    SELECT IFNULL(SUM(amount), 0) AS total
    FROM deposits
    WHERE member_id = @member_id AND is_cancelled = 0
  `);
  const totalWithdrawalsStmt = db.prepare(`
    SELECT IFNULL(SUM(amount), 0) AS total
    FROM withdrawals
    WHERE member_id = @member_id AND is_cancelled = 0
  `);
  const totalDeposits = (totalDepositsStmt.get({ member_id: payload.memberId }) as { total: number } | undefined)?.total ?? 0;
  const totalWithdrawals = (totalWithdrawalsStmt.get({ member_id: payload.memberId }) as { total: number } | undefined)?.total ?? 0;
  const availableBalance = totalDeposits - totalWithdrawals;

  if (availableBalance < payload.amount) {
    throw createIpcError('HIGH_WITHDRAWAL_AMOUNT', 'Member balance is too low for this withdrawal.');
  }

  const id = randomUUID();
  const transactionId = generateTransactionId(db, 'withdrawals', 'WDR');
  const timestamp = buildTransactionTimestamp(payload.date);
  const stmt = db.prepare<{
    id: string;
    transaction_id: string;
    member_id: string;
    issuer_id: string;
    amount: number;
    notes: string | null;
    date_created: string;
    date_updated: string;
  }>(`
    INSERT INTO withdrawals (id, transaction_id, member_id, issuer_id, amount, notes, date_created, date_updated)
    VALUES (@id, @transaction_id, @member_id, @issuer_id, @amount, @notes, @date_created, @date_updated)
  `);

  stmt.run({
    id,
    transaction_id: transactionId,
    member_id: payload.memberId,
    issuer_id: payload.issuerId,
    amount: payload.amount,
    notes: payload.notes ?? null,
    date_created: timestamp,
    date_updated: timestamp,
  });

  return fetchWithdrawalById(db, id);
}

/**
 * Returns a paginated, optionally filtered list of withdrawals ordered by most recently updated
 * so the renderer can power tables without re-implementing pagination math.
 */
export function fetchWithdrawals(
  db: Database.Database,
  options: WithdrawalQueryOptions = { page: 1, pageSize: 10 }
): PaginatedResponse<SanitizedWithdrawal> {
  // Apply pagination defaults and normalize guard rails.
  const page = Math.max(1, Math.floor(options.page ?? 1));
  const pageSize = Math.max(1, Math.floor(options.pageSize ?? 10));
  const offset = (page - 1) * pageSize;
  const includeCancelled = Boolean(options.includeCancelled);
  const filters: string[] = [];
  const params: Record<string, unknown> = {};

  if (!includeCancelled) {
    filters.push('w.is_cancelled = 0');
  }

  if (options.memberId) {
    filters.push('w.member_id = @member_id');
    params.member_id = options.memberId;
  }

  if (options.date) {
    filters.push('date(w.date_created) = @date');
    params.date = options.date;
  }

  const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : '';

  const countStmt = db.prepare(`
    SELECT COUNT(*) AS total
    FROM withdrawals w
    ${whereClause}
  `);
  const totalRecords = (countStmt.get(params) as { total: number }).total;

  const listStmt = db.prepare(`
    SELECT ${WITHDRAWAL_COLUMNS}, m.fullname as member_name, u.fullname as issuer_name
    FROM withdrawals w
    LEFT JOIN members m ON w.member_id = m.id
    LEFT JOIN users u ON w.issuer_id = u.id
    ${whereClause}
    ORDER BY datetime(w.date_created) DESC
    LIMIT @limit OFFSET @offset
  `);
  const rows = (listStmt.all({ ...params, limit: pageSize, offset }) as DbWithdrawalRow[]).map(
    sanitizeWithdrawal
  );

  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));

  return {
    data: rows,
    pagination: {
      page,
      pageSize,
      totalRecords,
      totalPages,
    },
  };
}

/**
 * Looks up a single withdrawal record so CRUD helpers can respond with fresh state snapshots.
 */
export function fetchWithdrawalById(db: Database.Database, id: string) {
  // Fetch single withdrawal to reuse within CRUD helpers.
  const stmt = db.prepare(`
    SELECT ${WITHDRAWAL_COLUMNS}, m.fullname as member_name, u.fullname as issuer_name
    FROM withdrawals w
    LEFT JOIN members m ON w.member_id = m.id
    LEFT JOIN users u ON w.issuer_id = u.id
    WHERE w.id = @id
    LIMIT 1
  `);
  const record = stmt.get({ id }) as DbWithdrawalRow | undefined;
  return record ? sanitizeWithdrawal(record) : null;
}

/**
 * Applies partial updates to withdrawal rows, only touching fields present in the payload.
 */
export function updateWithdrawal(db: Database.Database, payload: UpdateWithdrawalPayload) {
  // Build a dynamic SET clause so only provided fields are updated.
  const fields: string[] = [];
  const params: Record<string, unknown> = { id: payload.id };

  if (payload.memberId !== undefined) {
    fields.push('member_id = @member_id');
    params.member_id = payload.memberId;
  }

  if (payload.issuerId !== undefined) {
    fields.push('issuer_id = @issuer_id');
    params.issuer_id = payload.issuerId;
  }

  if (payload.amount !== undefined) {
    fields.push('amount = @amount');
    params.amount = payload.amount;
  }

  if (payload.notes !== undefined) {
    fields.push('notes = @notes');
    params.notes = payload.notes ?? null;
  }

  if (!fields.length) {
    return fetchWithdrawalById(db, payload.id);
  }

  const stmt = db.prepare(`
    UPDATE withdrawals
    SET ${fields.join(', ')}, date_updated = datetime('now')
    WHERE id = @id
  `);
  const result = stmt.run(params);
  if (result.changes === 0) {
    return null;
  }
  return fetchWithdrawalById(db, payload.id);
}

/**
 * Performs a soft delete so historical withdrawals remain available for auditing.
 */
export function deleteWithdrawal(db: Database.Database, payload: DeleteWithdrawalPayload) {
  // Soft-delete withdrawals so audit history stays intact.
  const stmt = db.prepare(`
    UPDATE withdrawals
    SET is_cancelled = 1, date_updated = datetime('now')
    WHERE id = @id AND is_cancelled = 0
  `);
  const result = stmt.run({ id: payload.id });
  return { success: result.changes > 0 } as const;
}

export function fetchDailySummary(db: Database.Database, date: string): DailySummary {
  const depositStats = db.prepare(`
    SELECT
      IFNULL(SUM(amount), 0) as total_amount,
      COUNT(*) as count,
      IFNULL(SUM(refreshment_token), 0) as refreshment_total,
      SUM(CASE WHEN refreshment_token > 0 THEN 1 ELSE 0 END) as refreshment_count
    FROM deposits
    WHERE date(date_created) = @date AND is_cancelled = 0
  `).get({ date }) as { total_amount: number; count: number; refreshment_total: number; refreshment_count: number };

  const withdrawalStats = db.prepare(`
    SELECT
      IFNULL(SUM(amount), 0) as total_amount,
      COUNT(*) as count
    FROM withdrawals
    WHERE date(date_created) = @date AND is_cancelled = 0
  `).get({ date }) as { total_amount: number; count: number };

  return {
    totalDepositsAmount: depositStats.total_amount,
    depositCount: depositStats.count,
    totalWithdrawalsAmount: withdrawalStats.total_amount,
    withdrawalCount: withdrawalStats.count,
    netCollection: depositStats.total_amount - withdrawalStats.total_amount,
    refreshmentTokenAmount: depositStats.refreshment_total,
    refreshmentTokenCount: depositStats.refreshment_count ?? 0,
  };
}

