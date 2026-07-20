import Database from 'better-sqlite3';
import { randomUUID } from 'crypto';
import { DEPOSIT_BASE_COLUMNS } from '../constants';
import {
  CreateDepositPayload,
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

/**
 * Normalizes deposit rows to the sanitized variant consumed by IPC responders.
 */
function sanitizeDeposit(row: DbDepositRow): SanitizedDeposit {
  return row;
}

/**
 * Inserts a deposit record while letting SQLite manage timestamps and sync flags.
 */
export function createDeposit(db: Database.Database, payload: CreateDepositPayload) {
  const id = randomUUID();
  const stmt = db.prepare(`
    INSERT INTO deposits (id, member_id, received_by, payment_method, amount, notes)
    VALUES (@id, @member_id, @received_by, @payment_method, @amount, @notes)
  `);

  stmt.run({
    id,
    member_id: payload.memberId,
    received_by: payload.receivedBy,
    payment_method: payload.paymentMethod,
    amount: payload.amount,
    notes: payload.notes ?? null,
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
    filters.push('is_cancelled = 0');
  }

  if (options.memberId) {
    filters.push('member_id = @member_id');
    params.member_id = options.memberId;
  }

  const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : '';

  const countStmt = db.prepare(`
    SELECT COUNT(*) as total
    FROM deposits
    ${whereClause}
  `);
  const totalRecords = (countStmt.get(params) as { total: number }).total;

  const listStmt = db.prepare(`
    SELECT ${DEPOSIT_BASE_COLUMNS}
    FROM deposits
    ${whereClause}
    ORDER BY datetime(date_updated) DESC
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
    SELECT ${DEPOSIT_BASE_COLUMNS}
    FROM deposits
    WHERE id = @id
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
  return row;
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
  const stmt = db.prepare<{
    id: string;
    member_id: string;
    issuer_id: string;
    amount: number;
    notes: string | null;
  }>(`
    INSERT INTO withdrawals (id, member_id, issuer_id, amount, notes)
    VALUES (@id, @member_id, @issuer_id, @amount, @notes)
  `);

  stmt.run({
    id,
    member_id: payload.memberId,
    issuer_id: payload.issuerId,
    amount: payload.amount,
    notes: payload.notes ?? null,
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
    filters.push('is_cancelled = 0');
  }

  if (options.memberId) {
    filters.push('member_id = @member_id');
    params.member_id = options.memberId;
  }

  const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : '';

  const countStmt = db.prepare(`
    SELECT COUNT(*) AS total
    FROM withdrawals
    ${whereClause}
  `);
  const totalRecords = (countStmt.get(params) as { total: number }).total;

  const listStmt = db.prepare(`
    SELECT ${WITHDRAWAL_BASE_COLUMNS}
    FROM withdrawals
    ${whereClause}
    ORDER BY datetime(date_updated) DESC
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
    SELECT ${WITHDRAWAL_BASE_COLUMNS}
    FROM withdrawals
    WHERE id = @id
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

