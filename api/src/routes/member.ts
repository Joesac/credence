import { Router } from 'express';
import { z } from 'zod';
import { eq, and, desc, sql } from 'drizzle-orm';
import { db } from '../../db';
import {
  members,
  users,
  deposits,
  withdrawals,
  loans,
  loan_repayments,
  notifications,
} from '../../db/schema';
import { requireMember } from '../middleware/member-auth';
import { verifyPassword, hashPassword } from '../utils/password';

const router = Router();

// All member routes require JWT auth
router.use(requireMember);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toNumber(value: unknown): number {
  return typeof value === 'string' ? parseFloat(value) : (value as number) ?? 0;
}

function getMemberId(req: { member?: { memberId: string } }): string {
  const id = req.member?.memberId;
  if (!id) throw new Error('Member ID missing from request');
  return id;
}

// ---------------------------------------------------------------------------
// GET /api/members/me — Profile
// ---------------------------------------------------------------------------

router.get('/members/me', async (req, res, next) => {
  try {
    const memberId = getMemberId(req);

    const [member] = await db
      .select({
        id: members.id,
        fullname: members.fullname,
        account_number: members.account_number,
        telephoneNumber: members.telephoneNumber,
        location: members.location,
        date_created: members.date_created,
        date_updated: members.date_updated,
        is_disabled: members.is_disabled,
      })
      .from(members)
      .where(and(eq(members.id, memberId), eq(members.is_deleted, false)));

    if (!member) {
      res.status(404).json({ code: 'NOT_FOUND', message: 'Member not found.' });
      return;
    }

    res.json(member);
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// GET /api/members/me/dashboard — Summary + recent activities
// ---------------------------------------------------------------------------

router.get('/members/me/dashboard', async (req, res, next) => {
  try {
    const memberId = getMemberId(req);

    // Financial summary via aggregate queries
    const [depositAgg] = await db
      .select({
        total: sql<string>`COALESCE(SUM(${deposits.amount}), 0)`,
        tokens: sql<string>`COALESCE(SUM(${deposits.refreshment_token}), 0)`,
      })
      .from(deposits)
      .where(and(eq(deposits.member_id, memberId), eq(deposits.is_cancelled, false)));

    const [withdrawalAgg] = await db
      .select({ total: sql<string>`COALESCE(SUM(${withdrawals.amount}), 0)` })
      .from(withdrawals)
      .where(and(eq(withdrawals.member_id, memberId), eq(withdrawals.is_cancelled, false)));

    const [loanAgg] = await db
      .select({
        count: sql<number>`COUNT(*)::int`,
        outstanding: sql<string>`COALESCE(SUM(${loans.amount} + (${loans.amount} * ${loans.interest_rate} / 100)), 0)`,
      })
      .from(loans)
      .where(and(eq(loans.member_id, memberId), eq(loans.is_cancelled, false)));

    // Total repaid across all active loans
    const [repaidAgg] = await db
      .select({ total: sql<string>`COALESCE(SUM(${loan_repayments.amount}), 0)` })
      .from(loan_repayments)
      .innerJoin(loans, eq(loans.id, loan_repayments.loan_id))
      .where(
        and(
          eq(loans.member_id, memberId),
          eq(loans.is_cancelled, false),
          eq(loan_repayments.is_cancelled, false),
        ),
      );

    const totalDeposits = toNumber(depositAgg?.total);
    const totalWithdrawals = toNumber(withdrawalAgg?.total);
    const totalOutstanding = toNumber(loanAgg?.outstanding) - toNumber(repaidAgg?.total);

    // Recent activities — union of deposits, withdrawals, loans, repayments
    const recentDeposits = await db
      .select({
        id: deposits.id,
        type: sql<'deposit'>`'deposit'`,
        amount: deposits.amount,
        date: deposits.date_created,
        status: sql<string>`CASE WHEN ${deposits.is_cancelled} THEN 'cancelled' ELSE 'completed' END`,
      })
      .from(deposits)
      .where(eq(deposits.member_id, memberId))
      .orderBy(desc(deposits.date_created))
      .limit(5);

    const recentWithdrawals = await db
      .select({
        id: withdrawals.id,
        type: sql<'withdrawal'>`'withdrawal'`,
        amount: withdrawals.amount,
        date: withdrawals.date_created,
        status: sql<string>`CASE WHEN ${withdrawals.is_cancelled} THEN 'cancelled' ELSE 'completed' END`,
      })
      .from(withdrawals)
      .where(eq(withdrawals.member_id, memberId))
      .orderBy(desc(withdrawals.date_created))
      .limit(5);

    const recentLoans = await db
      .select({
        id: loans.id,
        type: sql<'loan'>`'loan'`,
        amount: loans.amount,
        date: loans.date_created,
        status: sql<string>`CASE WHEN ${loans.is_cancelled} THEN 'cancelled' ELSE 'active' END`,
      })
      .from(loans)
      .where(eq(loans.member_id, memberId))
      .orderBy(desc(loans.date_created))
      .limit(5);

    const recentRepayments = await db
      .select({
        id: loan_repayments.id,
        type: sql<'repayment'>`'repayment'`,
        amount: loan_repayments.amount,
        date: loan_repayments.date_created,
        status: sql<string>`CASE WHEN ${loan_repayments.is_cancelled} THEN 'cancelled' ELSE 'completed' END`,
      })
      .from(loan_repayments)
      .innerJoin(loans, eq(loans.id, loan_repayments.loan_id))
      .where(eq(loans.member_id, memberId))
      .orderBy(desc(loan_repayments.date_created))
      .limit(5);

    const allActivities = [...recentDeposits, ...recentWithdrawals, ...recentLoans, ...recentRepayments]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 10)
      .map((a) => ({
        ...a,
        member_name: '',
        amount: toNumber(a.amount),
      }));

    res.json({
      summary: {
        totalDeposits,
        totalWithdrawals,
        availableBalance: totalDeposits - totalWithdrawals,
        activeLoansCount: loanAgg?.count ?? 0,
        totalOutstanding: Math.max(0, totalOutstanding),
        totalRefreshmentTokens: toNumber(depositAgg?.tokens),
      },
      recentActivities: allActivities,
    });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// Pagination helper
// ---------------------------------------------------------------------------

const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

// ---------------------------------------------------------------------------
// GET /api/members/me/deposits — Paginated deposit history
// ---------------------------------------------------------------------------

router.get('/members/me/deposits', async (req, res, next) => {
  try {
    const memberId = getMemberId(req);
    const { page, limit } = paginationSchema.parse(req.query);
    const offset = (page - 1) * limit;

    const [countResult] = await db
      .select({ total: sql<number>`COUNT(*)::int` })
      .from(deposits)
      .where(eq(deposits.member_id, memberId));

    const rows = await db
      .select({
        id: deposits.id,
        transaction_id: deposits.transaction_id,
        member_id: deposits.member_id,
        member_name: members.fullname,
        received_by: deposits.received_by,
        received_by_name: users.fullname,
        payment_method: deposits.payment_method,
        amount: deposits.amount,
        refreshment_token: deposits.refreshment_token,
        notes: deposits.notes,
        is_cancelled: deposits.is_cancelled,
        date_created: deposits.date_created,
        date_updated: deposits.date_updated,
      })
      .from(deposits)
      .leftJoin(members, eq(members.id, deposits.member_id))
      .leftJoin(users, eq(users.id, deposits.received_by))
      .where(eq(deposits.member_id, memberId))
      .orderBy(desc(deposits.date_created))
      .limit(limit)
      .offset(offset);

    const total = countResult?.total ?? 0;

    res.json({
      data: rows.map((r) => ({
        ...r,
        amount: toNumber(r.amount),
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// GET /api/members/me/withdrawals — Paginated withdrawal history
// ---------------------------------------------------------------------------

router.get('/members/me/withdrawals', async (req, res, next) => {
  try {
    const memberId = getMemberId(req);
    const { page, limit } = paginationSchema.parse(req.query);
    const offset = (page - 1) * limit;

    const [countResult] = await db
      .select({ total: sql<number>`COUNT(*)::int` })
      .from(withdrawals)
      .where(eq(withdrawals.member_id, memberId));

    const rows = await db
      .select({
        id: withdrawals.id,
        transaction_id: withdrawals.transaction_id,
        member_id: withdrawals.member_id,
        member_name: members.fullname,
        issuer_id: withdrawals.issuer_id,
        issuer_name: users.fullname,
        amount: withdrawals.amount,
        notes: withdrawals.notes,
        is_cancelled: withdrawals.is_cancelled,
        date_created: withdrawals.date_created,
        date_updated: withdrawals.date_updated,
      })
      .from(withdrawals)
      .leftJoin(members, eq(members.id, withdrawals.member_id))
      .leftJoin(users, eq(users.id, withdrawals.issuer_id))
      .where(eq(withdrawals.member_id, memberId))
      .orderBy(desc(withdrawals.date_created))
      .limit(limit)
      .offset(offset);

    const total = countResult?.total ?? 0;

    res.json({
      data: rows.map((r) => ({
        ...r,
        amount: toNumber(r.amount),
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// GET /api/members/me/loans — Loan list with computed fields
// ---------------------------------------------------------------------------

router.get('/members/me/loans', async (req, res, next) => {
  try {
    const memberId = getMemberId(req);

    const memberLoans = await db
      .select()
      .from(loans)
      .where(eq(loans.member_id, memberId))
      .orderBy(desc(loans.date_created));

    const result = await Promise.all(
      memberLoans.map(async (loan) => {
        const [repaidAgg] = await db
          .select({ total: sql<string>`COALESCE(SUM(${loan_repayments.amount}), 0)` })
          .from(loan_repayments)
          .where(
            and(
              eq(loan_repayments.loan_id, loan.id),
              eq(loan_repayments.is_cancelled, false),
            ),
          );

        const principal = toNumber(loan.amount);
        const interestAmount = (principal * toNumber(loan.interest_rate)) / 100;
        const totalRepaid = toNumber(repaidAgg?.total);
        const outstandingBalance = Math.max(0, principal + interestAmount - totalRepaid);

        return {
          ...loan,
          amount: principal,
          interest_rate: toNumber(loan.interest_rate),
          computedInterestAmount: interestAmount,
          outstandingBalance,
          totalRepaid,
        };
      }),
    );

    res.json(result);
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// GET /api/members/me/loans/:id — Loan detail
// ---------------------------------------------------------------------------

router.get('/members/me/loans/:id', async (req, res, next) => {
  try {
    const memberId = getMemberId(req);
    const loanId = req.params.id;

    const [loan] = await db
      .select()
      .from(loans)
      .where(and(eq(loans.id, loanId), eq(loans.member_id, memberId)));

    if (!loan) {
      res.status(404).json({ code: 'NOT_FOUND', message: 'Loan not found.' });
      return;
    }

    const [repaidAgg] = await db
      .select({ total: sql<string>`COALESCE(SUM(${loan_repayments.amount}), 0)` })
      .from(loan_repayments)
      .where(
        and(eq(loan_repayments.loan_id, loan.id), eq(loan_repayments.is_cancelled, false)),
      );

    const principal = toNumber(loan.amount);
    const interestAmount = (principal * toNumber(loan.interest_rate)) / 100;
    const totalRepaid = toNumber(repaidAgg?.total);
    const outstandingBalance = Math.max(0, principal + interestAmount - totalRepaid);

    res.json({
      ...loan,
      amount: principal,
      interest_rate: toNumber(loan.interest_rate),
      computedInterestAmount: interestAmount,
      outstandingBalance,
      totalRepaid,
    });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// GET /api/members/me/loans/:id/repayments — Repayment history for a loan
// ---------------------------------------------------------------------------

router.get('/members/me/loans/:id/repayments', async (req, res, next) => {
  try {
    const memberId = getMemberId(req);
    const loanId = req.params.id;

    // Verify the loan belongs to the member
    const [loan] = await db
      .select({ id: loans.id })
      .from(loans)
      .where(and(eq(loans.id, loanId), eq(loans.member_id, memberId)));

    if (!loan) {
      res.status(404).json({ code: 'NOT_FOUND', message: 'Loan not found.' });
      return;
    }

    const repayments = await db
      .select()
      .from(loan_repayments)
      .where(eq(loan_repayments.loan_id, loanId))
      .orderBy(desc(loan_repayments.date_created));

    res.json(
      repayments.map((r) => ({
        ...r,
        amount: toNumber(r.amount),
      })),
    );
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// PATCH /api/members/me/password — Change password
// ---------------------------------------------------------------------------

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(6).max(100),
});

router.patch('/members/me/password', async (req, res, next) => {
  try {
    const memberId = getMemberId(req);
    const parsed = changePasswordSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ code: 'VALIDATION_ERROR', message: parsed.error.message });
      return;
    }

    const { currentPassword, newPassword } = parsed.data;

    const [member] = await db
      .select({ id: members.id, password: members.password })
      .from(members)
      .where(eq(members.id, memberId));

    if (!member || !member.password || !verifyPassword(currentPassword, member.password)) {
      res.status(401).json({ code: 'UNAUTHORIZED', message: 'Current password is incorrect.' });
      return;
    }

    const hashed = hashPassword(newPassword);
    await db
      .update(members)
      .set({ password: hashed, date_updated: new Date() })
      .where(eq(members.id, memberId));

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// POST /api/members/me/device-token — Register push notification token
// ---------------------------------------------------------------------------

const deviceTokenSchema = z.object({
  token: z.string().min(1),
});

router.post('/members/me/device-token', async (req, res, next) => {
  try {
    const memberId = getMemberId(req);
    const parsed = deviceTokenSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ code: 'VALIDATION_ERROR', message: parsed.error.message });
      return;
    }

    // Token storage will be implemented when push sending is added.
    // For now, acknowledge receipt so the client can proceed.
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// GET /api/members/me/notifications — Notification list
// ---------------------------------------------------------------------------

router.get('/members/me/notifications', async (req, res, next) => {
  try {
    const memberId = getMemberId(req);

    const items = await db
      .select()
      .from(notifications)
      .where(eq(notifications.member_id, memberId))
      .orderBy(desc(notifications.date_created))
      .limit(50);

    res.json(items);
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// PATCH /api/members/me/notifications/:id/read — Mark notification as read
// ---------------------------------------------------------------------------

router.patch('/members/me/notifications/:id/read', async (req, res, next) => {
  try {
    const memberId = getMemberId(req);
    const notificationId = req.params.id;

    const [updated] = await db
      .update(notifications)
      .set({ is_read: true })
      .where(and(eq(notifications.id, notificationId), eq(notifications.member_id, memberId)))
      .returning();

    if (!updated) {
      res.status(404).json({ code: 'NOT_FOUND', message: 'Notification not found.' });
      return;
    }

    res.json(updated);
  } catch (err) {
    next(err);
  }
});

export { router as memberRouter };
