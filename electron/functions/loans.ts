import Database from 'better-sqlite3';
import { randomUUID } from 'crypto';
import { LOAN_BASE_COLUMNS } from '../constants';
import { createIpcError } from '../errors';
import {
  CreateLoanPayload,
  UpdateLoanPayload,
  DeleteLoanPayload,
  LoanQueryOptions,
  PaginatedResponse,
  DbLoanRow,
  SanitizedLoan,
} from '../types';

type LoanRowWithAggregates = DbLoanRow & { total_repaid?: number };

function sanitizeLoan(row: LoanRowWithAggregates): SanitizedLoan {
  const totalRepaid = row.total_repaid ?? 0;
  const computedInterestAmount = row.amount * (row.interest_rate / 100);
  const outstandingBalance = row.amount + computedInterestAmount - totalRepaid;
  return {
    ...row,
    computedInterestAmount,
    outstandingBalance,
    totalRepaid,
  };
}

/**
 * Aggregates every uncancelled loan for a member to detect open balances.
 */
function resolveOutstandingLoans(db: Database.Database, memberId: string) {
  const activeLoanStmt = db.prepare(`
    SELECT loans.id,
       loans.amount,
       loans.interest_rate,
       IFNULL(sumRepayments.total_repaid, 0) AS total_repaid
    FROM loans
    LEFT JOIN (
        SELECT loan_id, SUM(amount) AS total_repaid
        FROM loan_repayments
        GROUP BY loan_id
    ) AS sumRepayments ON sumRepayments.loan_id = loans.id
    WHERE loans.member_id = @member_id
    AND loans.is_cancelled = 0;
  `);

  const openLoans = activeLoanStmt.all({ member_id: memberId }) as LoanRowWithAggregates[];
  const outstandingAmounts = openLoans.map((loan) => {
    const computedInterestAmount = loan.amount * (loan.interest_rate / 100);
    return loan.amount + computedInterestAmount - (loan.total_repaid ?? 0);
  }).filter((balance) => balance > 0);

  const totalOutstanding = outstandingAmounts.reduce((sum, balance) => sum + balance, 0);
  return {
    hasOutstandingBalance: outstandingAmounts.length > 0,
    totalOutstanding,
  };
}

export function createLoan(db: Database.Database, payload: CreateLoanPayload) {
  const { hasOutstandingBalance, totalOutstanding } = resolveOutstandingLoans(db, payload.memberId);
  if (hasOutstandingBalance) {
    throw createIpcError(
      'HAS_EXISTING_LOAN',
      `Member already has an active loan balance of ${totalOutstanding.toFixed(2)}.`
    );
  }

  const id = randomUUID();
  const stmt = db.prepare(`
    INSERT INTO loans (id, member_id, issuer_id, amount, interest_rate, repayment_frequency, due_date, notes)
    VALUES (@id, @member_id, @issuer_id, @amount, @interest_rate, @repayment_frequency, @due_date, @notes)
  `);

  stmt.run({
    id,
    member_id: payload.memberId,
    issuer_id: payload.issuerId,
    amount: payload.amount,
    interest_rate: payload.interestRate,
    repayment_frequency: payload.repaymentFrequency,
    due_date: payload.dueDate,
    notes: payload.notes ?? null,
  });

  return fetchLoanById(db, id);
}

export function updateLoan(db: Database.Database, payload: UpdateLoanPayload) {
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

    if (payload.interestRate !== undefined) {
        fields.push('interest_rate = @interest_rate');
        params.interest_rate = payload.interestRate;
    }

    if (payload.repaymentFrequency !== undefined) {
        fields.push('repayment_frequency = @repayment_frequency');
        params.repayment_frequency = payload.repaymentFrequency;
    }

    if (payload.dueDate !== undefined) {
        fields.push('due_date = @due_date');
        params.due_date = payload.dueDate;
    }

    if (payload.notes !== undefined) {
        fields.push('notes = @notes');
        params.notes = payload.notes ?? null;
    }

    if (!fields.length) {
        return fetchLoanById(db, payload.id);
    }

    const stmt = db.prepare(`
    UPDATE loans
    SET ${fields.join(', ')}, date_created = date_created
    WHERE id = @id
  `);
    const result = stmt.run(params);
    if (result.changes === 0) {
        return null;
    }
    return fetchLoanById(db, payload.id);
}

export function deleteLoan(db: Database.Database, payload: DeleteLoanPayload) {
    const stmt = db.prepare(`
    UPDATE loans
    SET is_cancelled = 1
    WHERE id = @id AND is_cancelled = 0
  `);
    const result = stmt.run({ id: payload.id });
    return { success: result.changes > 0 } as const;
}

export function fetchLoanById(db: Database.Database, id: string) {
    const stmt = db.prepare(`
    SELECT ${LOAN_BASE_COLUMNS},
      members.fullname AS member_name,
      members.account_number AS member_account_number,
      users.fullname AS issuer_name,
      users.username AS issuer_username
    FROM loans
    LEFT JOIN members ON members.id = loans.member_id
    LEFT JOIN users ON users.id = loans.issuer_id
    WHERE loans.id = @id
    LIMIT 1
  `);
    const record = stmt.get({ id }) as (LoanRowWithAggregates & {
        member_name: string | null;
        member_account_number: string | null;
        issuer_name: string | null;
        issuer_username: string | null;
    }) | undefined;
    if (!record) {
        return null;
    }

    const repaymentsStmt = db.prepare(`
    SELECT IFNULL(SUM(amount), 0) as total_repaid
    FROM loan_repayments
    WHERE loan_id = @loan_id
  `);
    const repayments = repaymentsStmt.get({ loan_id: record.id }) as { total_repaid: number } | undefined;
    const sanitized = sanitizeLoan({ ...record, total_repaid: repayments?.total_repaid ?? 0 });
    return {
        ...sanitized,
        member: record.member_name
            ? {
                id: sanitized.member_id,
                fullname: record.member_name,
                accountNumber: record.member_account_number,
            }
            : null,
        issuer: record.issuer_name
            ? {
                id: sanitized.issuer_id,
                fullname: record.issuer_name,
                username: record.issuer_username,
            }
            : null,
    };
}

function buildLoanFilters(options: LoanQueryOptions) {
    const filters: string[] = [];
    const params: Record<string, unknown> = {};

    if (!options.includeCancelled) {
        filters.push('loans.is_cancelled = 0');
    }

    if (options.memberId) {
        filters.push('loans.member_id = @member_id');
        params.member_id = options.memberId;
    }

    if (options.issuerId) {
        filters.push('loans.issuer_id = @issuer_id');
        params.issuer_id = options.issuerId;
    }

    const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
    return { whereClause, params } as const;
}

export function fetchLoans(
    db: Database.Database,
    options: LoanQueryOptions
): PaginatedResponse<SanitizedLoan> {
    const page = Math.max(1, Math.floor(options.page ?? 1));
    const pageSize = Math.max(1, Math.floor(options.pageSize ?? 10));
    const offset = (page - 1) * pageSize;
    const { whereClause, params } = buildLoanFilters(options);

    const countStmt = db.prepare(`
    SELECT COUNT(*) as total
    FROM loans
    ${whereClause}
  `);
    const totalRecords = (countStmt.get(params) as { total: number }).total;

    const listStmt = db.prepare(`
    SELECT ${LOAN_BASE_COLUMNS},
      IFNULL(sumRepayments.total_repaid, 0) as total_repaid
    FROM loans
    LEFT JOIN (
      SELECT loan_id, SUM(amount) as total_repaid
      FROM loan_repayments
      GROUP BY loan_id
    ) AS sumRepayments ON sumRepayments.loan_id = loans.id
    ${whereClause}
    ORDER BY datetime(loans.date_created) DESC
    LIMIT @limit OFFSET @offset
  `);

    const rows = listStmt
        .all({ ...params, limit: pageSize, offset })
        .map((row) => sanitizeLoan(row as LoanRowWithAggregates));
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

export function fetchLoansByMember(
    db: Database.Database,
    memberId: string,
    options: Omit<LoanQueryOptions, 'memberId'>
) {
    return fetchLoans(db, { ...options, memberId });
}

export function fetchLoansByIssuer(
    db: Database.Database,
    issuerId: string,
    options: Omit<LoanQueryOptions, 'issuerId'>
) {
    return fetchLoans(db, { ...options, issuerId });
}
