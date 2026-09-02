/**
 * Notification subsystem constants.
 *
 * The transaction domain emits *events* (DEPOSIT_CREATED, WITHDRAWAL_CREATED)
 * without knowing anything about OneSignal. The notification subsystem maps
 * those events to push notifications.
 */

/** Domain events that can become push notifications. */
export const NOTIFICATION_EVENT_TYPES = {
  DEPOSIT_CREATED: 'DEPOSIT_CREATED',
  WITHDRAWAL_CREATED: 'WITHDRAWAL_CREATED',
} as const;

export type NotificationEventType = keyof typeof NOTIFICATION_EVENT_TYPES;

export const NOTIFICATION_EVENT_TYPE_LIST = Object.values(NOTIFICATION_EVENT_TYPES);

/** Processing state machine for outbox events. */
export const NOTIFICATION_EVENT_STATUS = {
  /** Created atomically with the transaction; waiting to be claimed. */
  PENDING: 'PENDING',
  /** Claimed by a processor; delivery attempt in progress. */
  PROCESSING: 'PROCESSING',
  /** OneSignal accepted the request (not proof the device displayed it). */
  SENT: 'SENT',
  /** Suppressed (e.g. member disabled the category) — nothing was sent. */
  SKIPPED: 'SKIPPED',
  /** Permanent failure or retries exhausted. */
  FAILED: 'FAILED',
} as const;

export type NotificationEventStatus = keyof typeof NOTIFICATION_EVENT_STATUS;

/** How long a PROCESSING claim may live before it is considered stale. */
export const CLAIM_STALE_AFTER = '5 minutes';

/** Default maximum delivery attempts before an event is marked FAILED. */
export const DEFAULT_MAX_ATTEMPTS = 5;

/** Default number of events a single processor run may claim.
 *  Kept at 10 on the Cloudflare Workers Free plan to stay within the 10 ms
 *  CPU limit per Cron Trigger invocation. Increase only after moving to a
 *  paid plan or an external cron with higher CPU budget.
 */
export const DEFAULT_BATCH_SIZE = 10;

/** Timeout (ms) for a single OneSignal HTTP request. */
export const ONESIGNAL_TIMEOUT_MS = 10_000;

export const ONESIGNAL_API_URL = 'https://api.onesignal.com/notifications';
