import Database from 'better-sqlite3';
import { randomUUID } from 'crypto';
import { createIpcError } from '../errors';
import { buildTransactionTimestamp } from './utils';
import {
  CreateFundDistributionPayload,
  FundDistributionMemberStatsPayload,
  FundDistributionStats,
  GlobalFundDistributionStats,
} from '../types';

export function createFundDistribution(
  db: Database.Database,
  payload: CreateFundDistributionPayload
): { success: boolean } {
  const { memberId, giverId, amount, notes } = payload;

  if (!memberId || !giverId || amount <= 0) {
    throw createIpcError('INVALID_PAYLOAD', 'A valid member, giver, and amount are required.');
  }

  const hasReceivedStmt = db.prepare(`
    SELECT COUNT(*) AS count
    FROM fund_distributions
    WHERE member_id = @member_id
  `);
  const hasReceived = (hasReceivedStmt.get({ member_id: memberId }) as { count: number }).count > 0;

  if (hasReceived) {
    throw createIpcError('ALREADY_RECEIVED', 'This member has already received a fund distribution.');
  }

  const dateReceived = payload.dateReceived ?? buildTransactionTimestamp(new Date().toLocaleDateString('en-CA'));

  const stmt = db.prepare(`
    INSERT INTO fund_distributions (
      id,
      member_id,
      giver_id,
      amount,
      date_received,
      notes,
      date_created,
      is_synced
    )
    VALUES (
      @id,
      @member_id,
      @giver_id,
      @amount,
      @date_received,
      @notes,
      datetime('now'),
      0
    )
  `);

  stmt.run({
    id: randomUUID(),
    member_id: memberId,
    giver_id: giverId,
    amount,
    date_received: dateReceived,
    notes: notes ?? null,
  });

  return { success: true };
}

export function getFundDistributionStats(
  db: Database.Database,
  payload: FundDistributionMemberStatsPayload
): FundDistributionStats {
  const { memberId } = payload;

  if (!memberId) {
    throw createIpcError('INVALID_PAYLOAD', 'Member id is required.');
  }

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
      ) AS totalWithdrawals,
      (
        SELECT IFNULL(SUM(repayment_amount), 0)
        FROM (
          SELECT lr.amount AS repayment_amount
          FROM loan_repayments lr
          JOIN loans l ON l.id = lr.loan_id
          WHERE l.member_id = @member_id AND lr.is_cancelled = 0 AND l.is_cancelled = 0
        ) AS repayments
      ) AS totalRepayments,
      (
        SELECT IFNULL(SUM(outstanding), 0)
        FROM (
          SELECT
            (l.amount + (l.amount * (l.interest_rate / 100)) - IFNULL(r.total_repaid, 0)) AS outstanding
          FROM loans l
          LEFT JOIN (
            SELECT loan_id, SUM(amount) AS total_repaid
            FROM loan_repayments
            WHERE is_cancelled = 0
            GROUP BY loan_id
          ) r ON r.loan_id = l.id
          WHERE l.member_id = @member_id AND l.is_cancelled = 0
        ) AS loan_outstanding
        WHERE outstanding > 0
      ) AS totalLoanAmount,
      (
        SELECT COUNT(*) > 0
        FROM fund_distributions
        WHERE member_id = @member_id
      ) AS hasReceived
  `);

  const result = stmt.get({ member_id: memberId }) as
    | {
        totalDeposits: number;
        totalWithdrawals: number;
        totalRepayments: number;
        totalLoanAmount: number;
        hasReceived: number;
      }
    | undefined;

  const totalDeposits = result?.totalDeposits ?? 0;
  const totalWithdrawals = result?.totalWithdrawals ?? 0;
  const totalLoanAmount = result?.totalLoanAmount ?? 0;
  const amountToReceive = totalDeposits - (totalWithdrawals + totalLoanAmount);

  return {
    totalDeposits,
    totalWithdrawals,
    totalLoanAmount,
    totalRepayments: result?.totalRepayments ?? 0,
    amountToReceive,
    hasReceived: result ? result.hasReceived === 1 : false,
  };
}

export function getGlobalFundDistributionStats(
  db: Database.Database
): GlobalFundDistributionStats {
  const stmt = db.prepare(`
    SELECT
      (
        SELECT IFNULL(SUM(amount), 0)
        FROM deposits
        WHERE is_cancelled = 0
      ) AS totalDeposits,
      (
        SELECT IFNULL(SUM(amount), 0)
        FROM withdrawals
        WHERE is_cancelled = 0
      ) AS totalWithdrawals
  `);

  const result = stmt.get() as
    | { totalDeposits: number; totalWithdrawals: number }
    | undefined;

  const totalDeposits = result?.totalDeposits ?? 0;
  const totalWithdrawals = result?.totalWithdrawals ?? 0;

  return {
    totalDeposits,
    totalWithdrawals,
    netContributions: totalDeposits - totalWithdrawals,
  };
}
