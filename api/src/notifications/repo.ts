import { sql, type SQL } from 'drizzle-orm';
import { db } from '../../db';
import { CLAIM_STALE_AFTER, NOTIFICATION_EVENT_STATUS } from './constants';
import type { NotificationEventStatus } from './constants';

/**
 * Durable outbox repository — the only place that touches notification_events
 * rows outside event creation (see events.ts).
 *
 * Concurrency: `claimEvents` atomically flips PENDING → PROCESSING in a single
 * statement using FOR UPDATE SKIP LOCKED, so overlapping serverless invocations
 * can never process the same event twice.
 */

export interface ClaimedEventRow {
  id: string;
  type: string;
  member_id: string;
  entity_id: string;
  payload: unknown;
  attempt_count: number;
}

// Compile-time constant, safe for raw interpolation.
const STALE_INTERVAL = sql.raw(`interval '${CLAIM_STALE_AFTER}'`);

function normalizeRows(rows: unknown[]): ClaimedEventRow[] {
  return (rows as Array<Record<string, unknown>>).map((r) => ({
    id: String(r.id),
    type: String(r.type),
    member_id: String(r.member_id),
    entity_id: String(r.entity_id),
    payload: r.payload,
    attempt_count: Number(r.attempt_count ?? 0),
  }));
}

/**
 * Claims up to `batchSize` eligible events.
 * Eligible = PENDING and due, OR PROCESSING claims older than the stale
 * threshold (crashed processors). Returns the claimed rows.
 */
export async function claimEvents(batchSize: number): Promise<ClaimedEventRow[]> {
  const result = await db.execute(sql`
    WITH candidates AS (
      SELECT "id"
      FROM "notification_events"
      WHERE ("status" = ${NOTIFICATION_EVENT_STATUS.PENDING} AND "available_at" <= now())
         OR ("status" = ${NOTIFICATION_EVENT_STATUS.PROCESSING} AND "claimed_at" < now() - ${STALE_INTERVAL})
      ORDER BY "available_at"
      LIMIT ${batchSize}
      FOR UPDATE SKIP LOCKED
    )
    UPDATE "notification_events" e
    SET "status" = ${NOTIFICATION_EVENT_STATUS.PROCESSING}, "claimed_at" = now(), "updated_at" = now()
    FROM candidates
    WHERE e."id" = candidates."id"
    RETURNING e."id", e."type", e."member_id", e."entity_id", e."payload", e."attempt_count"
  `);
  return normalizeRows(result.rows);
}

function updateEvent(id: string, patch: SQL): Promise<unknown> {
  return db.execute(sql`
    UPDATE "notification_events"
    SET ${patch}, "updated_at" = now()
    WHERE "id" = ${id}
  `);
}

/** Marks an event terminal: SENT (accepted) or SKIPPED (suppressed). */
export function markProcessed(id: string, status: 'SENT' | 'SKIPPED'): Promise<unknown> {
  return updateEvent(
    id,
    sql`"status" = ${status}, "processed_at" = now(), "last_error" = NULL`,
  );
}

/**
 * Requeues a transiently failed event with exponential backoff.
 * `attemptCount` is the attempt that just failed (>= 1); the next run is
 * scheduled 2^attemptCount minutes out.
 */
export function requeue(id: string, attemptCount: number, error: string): Promise<unknown> {
  return updateEvent(
    id,
    sql`"status" = ${NOTIFICATION_EVENT_STATUS.PENDING}, "attempt_count" = ${attemptCount},
         "available_at" = now() + (pow(2, ${attemptCount}) * interval '1 minute'),
         "last_error" = ${error}, "processed_at" = NULL`,
  );
}

/** Marks an event permanently failed. */
export function fail(id: string, error: string): Promise<unknown> {
  return updateEvent(
    id,
    sql`"status" = ${NOTIFICATION_EVENT_STATUS.FAILED}, "processed_at" = now(), "last_error" = ${error}`,
  );
}

export type NotificationEventRepo = typeof repo;

export const repo = {
  claim: claimEvents,
  markProcessed,
  requeue,
  fail,
};

export type { NotificationEventStatus };
