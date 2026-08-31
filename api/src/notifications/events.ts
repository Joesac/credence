import { sql, type SQL } from 'drizzle-orm';
import { NOTIFICATION_EVENT_TYPES, type NotificationEventType } from './constants';
import { notifLogger } from './logger';

/**
 * Transactional outbox event creation.
 *
 * `buildUpsertWithEvents` wraps the existing idempotent upsert and the
 * notification-event insert into ONE SQL statement:
 *
 *   WITH upserted AS (INSERT ... ON CONFLICT (id) DO UPDATE ... RETURNING ...)
 *   INSERT INTO notification_events (...) SELECT ... FROM upserted WHERE ...
 *
 * Because it is a single statement it commits atomically:
 *   - transaction persisted  ⇔  notification event persisted
 *   - transaction rolled back  ⇒  no notification event
 *
 * The `(xmax = 0)` guard distinguishes a freshly inserted row from an
 * upserted update, so retried sync requests can never create a second
 * event. The UNIQUE (type, entity_id) constraint is the final backstop.
 */

export interface NotifiableTable {
  eventType: NotificationEventType;
  entityType: 'deposit' | 'withdrawal';
}

/** Tables whose newly persisted rows produce a notification event. */
export const NOTIFIABLE_TABLES: Record<string, NotifiableTable> = {
  deposits: { eventType: NOTIFICATION_EVENT_TYPES.DEPOSIT_CREATED, entityType: 'deposit' },
  withdrawals: { eventType: NOTIFICATION_EVENT_TYPES.WITHDRAWAL_CREATED, entityType: 'withdrawal' },
};

export function isNotifiableTable(table: string): table is keyof typeof NOTIFIABLE_TABLES {
  return table in NOTIFIABLE_TABLES;
}

interface BuildOptions {
  tableName: string;
  columns: string[];
  valuesChunks: SQL[];
}

/**
 * Builds the atomic upsert + outbox insert statement for a syncable batch.
 * The `columns`/`valuesChunks` arrays are produced by the sync route and are
 * identical to the non-notifiable path; only the wrapper differs.
 */
export function buildUpsertWithEvents({ tableName, columns, valuesChunks }: BuildOptions): SQL {
  const { eventType, entityType } = NOTIFIABLE_TABLES[tableName];
  const columnList = columns.map((c) => `"${c}"`).join(', ');
  const updateColumns = columns.filter((c) => c !== 'id');
  const conflictSet = updateColumns.map((c) => `"${c}" = EXCLUDED."${c}"`).join(', ');

  return sql`
    WITH upserted AS (
      INSERT INTO ${sql.identifier(tableName)} (${sql.raw(columnList)})
      VALUES ${sql.join(valuesChunks, sql`, `)}
      ON CONFLICT ("id") DO UPDATE SET ${sql.raw(conflictSet)}
      RETURNING "id", "member_id", "transaction_id", "is_cancelled", (xmax = 0) AS "__inserted"
    )
    INSERT INTO "notification_events"
      ("id", "type", "member_id", "entity_id", "payload", "status", "attempt_count", "available_at", "created_at", "updated_at")
    SELECT
      gen_random_uuid(),
      ${eventType},
      u."member_id",
      u."id",
      jsonb_build_object('entityType', ${entityType}::text, 'entityId', u."id", 'transactionId', u."transaction_id"),
      'PENDING',
      0,
      now(),
      now(),
      now()
    FROM upserted u
    WHERE u."__inserted" AND u."is_cancelled" = false
    ON CONFLICT ("type", "entity_id") DO NOTHING
  `;
}

/**
 * Logs the outcome of a notifiable sync batch. Used by the sync route after
 * the atomic statement succeeds so the full trace is observable.
 */
export function logEventCreation(tableName: string, syncedIds: string[]): void {
  const { eventType } = NOTIFIABLE_TABLES[tableName];
  notifLogger.info('notification_events_created', {
    table: tableName,
    eventType,
    syncedCount: syncedIds.length,
  });
}
