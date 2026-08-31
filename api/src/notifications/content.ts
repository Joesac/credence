import type { NotificationEventType } from './constants';

/**
 * Notification content providers.
 *
 * Each event type maps to a provider that turns the AUTHORITATIVE persisted
 * transaction row into a notification. Amounts are formatted from the
 * database value — never from the outbox payload — and the push payload only
 * carries navigation metadata, no sensitive financial data.
 *
 * Future event types (LOAN_APPROVED, PAYMENT_DUE, ...) only need a new
 * provider + event type; the infrastructure stays untouched.
 */

export type NotificationPrefsKey = 'deposit' | 'withdrawal' | 'loan' | 'repayment' | 'reminder';

export interface TransactionRow {
  id: string;
  transaction_id: string | null;
  amount: string | number;
  is_cancelled: boolean;
}

export interface NotificationContent {
  title: string;
  body: string;
  data: Record<string, unknown>;
  prefsKey: NotificationPrefsKey;
}

interface ContentProvider<T extends TransactionRow = TransactionRow> {
  entityTable: 'deposits' | 'withdrawals';
  prefsKey: NotificationPrefsKey;
  build(row: T): { title: string; body: string; data: Record<string, unknown> };
}

/**
 * Money formatting shared with the mobile app's `formatGHS`:
 * "GHS 500.00" / "GHS 1,234.50" using en-US grouping and 2 fraction digits.
 */
export function formatMoney(amount: string | number): string {
  const value = typeof amount === 'string' ? parseFloat(amount) : amount;
  const safe = Number.isFinite(value) ? value : 0;
  const formatted = Math.abs(safe).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `GHS ${formatted}`;
}

export const CONTENT_PROVIDERS: Record<NotificationEventType, ContentProvider> = {
  DEPOSIT_CREATED: {
    entityTable: 'deposits',
    prefsKey: 'deposit',
    build: (row) => ({
      title: 'Deposit received',
      body: `A deposit of ${formatMoney(row.amount)} has been recorded on your account.`,
      data: {
        type: 'DEPOSIT_CREATED',
        entityType: 'deposit',
        entityId: row.id,
        transactionId: row.transaction_id ?? null,
      },
    }),
  },
  WITHDRAWAL_CREATED: {
    entityTable: 'withdrawals',
    prefsKey: 'withdrawal',
    build: (row) => ({
      title: 'Withdrawal recorded',
      body: `A withdrawal of ${formatMoney(row.amount)} has been recorded on your account.`,
      data: {
        type: 'WITHDRAWAL_CREATED',
        entityType: 'withdrawal',
        entityId: row.id,
        transactionId: row.transaction_id ?? null,
      },
    }),
  },
};
