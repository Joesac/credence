import { eq, and } from 'drizzle-orm';
import { db } from '../../db';
import { deposits, withdrawals, member_notification_prefs } from '../../db/schema';
import { CONTENT_PROVIDERS, formatMoney } from './content';
import { OneSignalError, sendToMember } from './onesignal-service';
import type { NotificationEventType } from './constants';
import { shouldNotify, toApiPrefs } from '../utils/notification-prefs';

/**
 * NotificationService — turns an outbox event into a OneSignal push.
 *
 * Responsibilities:
 *  - load the authoritative transaction row from the database
 *  - apply the member's notification preferences
 *  - build title/body/data via the content provider registry
 *  - resolve the recipient (authenticated member id) and dispatch through
 *    the OneSignal service
 *
 * It never mutates event state — the processor owns the state machine.
 */

export interface ClaimedEvent {
  id: string;
  type: NotificationEventType;
  member_id: string;
  entity_id: string;
  payload: unknown;
  attempt_count: number;
}

export type ProcessOutcome = 'sent' | 'skipped';

export function isNotificationEventType(value: string): value is NotificationEventType {
  return value === 'DEPOSIT_CREATED' || value === 'WITHDRAWAL_CREATED';
}

async function loadEntity(
  eventType: NotificationEventType,
  entityId: string,
): Promise<{ id: string; transaction_id: string | null; amount: string | number; is_cancelled: boolean } | null> {
  if (eventType === 'DEPOSIT_CREATED') {
    const [row] = await db
      .select({ id: deposits.id, transaction_id: deposits.transaction_id, amount: deposits.amount, is_cancelled: deposits.is_cancelled })
      .from(deposits)
      .where(and(eq(deposits.id, entityId), eq(deposits.is_cancelled, false)));
    return row ?? null;
  }
  const [row] = await db
    .select({ id: withdrawals.id, transaction_id: withdrawals.transaction_id, amount: withdrawals.amount, is_cancelled: withdrawals.is_cancelled })
    .from(withdrawals)
    .where(and(eq(withdrawals.id, entityId), eq(withdrawals.is_cancelled, false)));
  return row ?? null;
}

async function loadPrefs(memberId: string) {
  const [row] = await db
    .select()
    .from(member_notification_prefs)
    .where(eq(member_notification_prefs.member_id, memberId));
  return toApiPrefs(row);
}

/**
 * Processes one event: loads authoritative data, applies preferences, and
 * dispatches to OneSignal. Returns 'sent' (accepted) or 'skipped' (suppressed).
 * Throws OneSignalError for delivery failures.
 */
export async function processEvent(event: ClaimedEvent): Promise<ProcessOutcome> {
  const provider = CONTENT_PROVIDERS[event.type];
  if (!provider) {
    throw new OneSignalError(`Unknown notification event type: ${event.type}`, 'permanent');
  }

  const row = await loadEntity(event.type, event.entity_id);
  if (!row) {
    // The transaction no longer exists or was cancelled — nothing to notify about.
    return 'skipped';
  }

  const prefs = await loadPrefs(event.member_id);
  if (!shouldNotify(provider.prefsKey, prefs)) {
    return 'skipped';
  }

  const content = provider.build(row);
  await sendToMember({
    externalUserId: event.member_id,
    headings: { en: content.title },
    contents: { en: content.body },
    data: content.data,
  });

  return 'sent';
}

// Re-exported for tests that assert formatting matches mobile conventions.
export { formatMoney };
