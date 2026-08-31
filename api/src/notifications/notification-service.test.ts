import { beforeEach, describe, expect, it, vi } from 'vitest';
import { deposits, withdrawals, member_notification_prefs } from '../../db/schema';
import { processEvent } from './notification-service';
import { sendToMember, OneSignalError } from './onesignal-service';
import type { ClaimedEventRow } from './repo';

// Fake DB: route table lookups to configurable row arrays.
const mocks = vi.hoisted(() => {
  const db = {
    select: vi.fn(),
  };
  const state = {
    depositRows: [] as unknown[],
    withdrawalRows: [] as unknown[],
    prefsRows: [] as unknown[],
  };
  return { db, state };
});

vi.mock('../../db', () => ({ db: mocks.db }));

vi.mock('./onesignal-service', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./onesignal-service')>();
  return { ...actual, sendToMember: vi.fn() };
});

function setupDb() {
  mocks.db.select.mockImplementation((_cols: unknown) => ({
    from: (table: unknown) => ({
      where: async () => {
        if (table === deposits) return mocks.state.depositRows;
        if (table === withdrawals) return mocks.state.withdrawalRows;
        if (table === member_notification_prefs) return mocks.state.prefsRows;
        return [];
      },
    }),
  }));
}

function makeEvent(overrides: Partial<ClaimedEventRow> = {}): ClaimedEventRow {
  return {
    id: 'evt-1',
    type: 'DEPOSIT_CREATED',
    member_id: 'member-1',
    entity_id: 'dep-1',
    payload: { entityId: 'dep-1' },
    attempt_count: 0,
    ...overrides,
  };
}

describe('NotificationService.processEvent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.state.depositRows = [];
    mocks.state.withdrawalRows = [];
    mocks.state.prefsRows = [];
    setupDb();
  });

  it('sends a deposit push built from the authoritative DB row', async () => {
    mocks.state.depositRows = [
      { id: 'dep-1', transaction_id: 'DEP-2026-0001', amount: '500.00', is_cancelled: false },
    ];

    const outcome = await processEvent(makeEvent());

    expect(outcome).toBe('sent');
    expect(sendToMember).toHaveBeenCalledWith({
      externalUserId: 'member-1',
      headings: { en: 'Deposit received' },
      contents: { en: 'A deposit of GHS 500.00 has been recorded on your account.' },
      data: {
        type: 'DEPOSIT_CREATED',
        entityType: 'deposit',
        entityId: 'dep-1',
        transactionId: 'DEP-2026-0001',
      },
    });
  });

  it('sends a withdrawal push built from the authoritative DB row', async () => {
    mocks.state.withdrawalRows = [
      { id: 'wdr-1', transaction_id: 'WDR-2026-0001', amount: '200.00', is_cancelled: false },
    ];

    const outcome = await processEvent(makeEvent({ type: 'WITHDRAWAL_CREATED', entity_id: 'wdr-1' }));

    expect(outcome).toBe('sent');
    expect(sendToMember).toHaveBeenCalledWith(
      expect.objectContaining({
        externalUserId: 'member-1',
        headings: { en: 'Withdrawal recorded' },
        contents: { en: 'A withdrawal of GHS 200.00 has been recorded on your account.' },
      }),
    );
  });

  it('skips when the member disabled the category in preferences', async () => {
    mocks.state.depositRows = [
      { id: 'dep-1', transaction_id: null, amount: '500.00', is_cancelled: false },
    ];
    mocks.state.prefsRows = [{ member_id: 'member-1', push_enabled: true, deposit_alerts: false }];

    const outcome = await processEvent(makeEvent());

    expect(outcome).toBe('skipped');
    expect(sendToMember).not.toHaveBeenCalled();
  });

  it('skips when push is globally disabled', async () => {
    mocks.state.depositRows = [
      { id: 'dep-1', transaction_id: null, amount: '500.00', is_cancelled: false },
    ];
    mocks.state.prefsRows = [{ member_id: 'member-1', push_enabled: false, deposit_alerts: true }];

    const outcome = await processEvent(makeEvent());

    expect(outcome).toBe('skipped');
    expect(sendToMember).not.toHaveBeenCalled();
  });

  it('skips when the transaction was cancelled or no longer exists', async () => {
    // No rows → treated as missing/cancelled entity.
    const outcome = await processEvent(makeEvent());

    expect(outcome).toBe('skipped');
    expect(sendToMember).not.toHaveBeenCalled();
  });

  it('does not fail the transaction when OneSignal is unavailable (error propagates to processor)', async () => {
    mocks.state.depositRows = [
      { id: 'dep-1', transaction_id: null, amount: '500.00', is_cancelled: false },
    ];
    vi.mocked(sendToMember).mockRejectedValue(new OneSignalError('timeout', 'transient'));

    await expect(processEvent(makeEvent())).rejects.toMatchObject({ kind: 'transient' });
  });

  it('throws a permanent error for unknown event types', async () => {
    await expect(processEvent(makeEvent({ type: 'LOAN_APPROVED' as never }))).rejects.toMatchObject({
      kind: 'permanent',
    });
  });
});
