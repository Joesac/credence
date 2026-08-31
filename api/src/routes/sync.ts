import { Router } from 'express';
import { z } from 'zod';
import { requireApiKey } from '../middleware/auth';
import { sql } from 'drizzle-orm';
import { db } from '../../db';
import { TABLE_REGISTRY, type SyncableTableName } from '../../db/schema';
import { buildUpsertWithEvents, isNotifiableTable, logEventCreation } from '../notifications/events';

const router = Router();

const SYNCABLE_TABLES = Object.keys(TABLE_REGISTRY) as SyncableTableName[];

const syncBodySchema = z.object({
  rows: z.array(z.record(z.string(), z.unknown())).max(100, { message: 'Maximum 100 rows per batch.' }),
});

/**
 * POST /api/sync/:table
 *
 * Upserts a batch of rows (max 100) into the specified table.
 * Uses ON CONFLICT (id) DO UPDATE — the local UUID `id` is the sole conflict target.
 * This makes retries idempotent: re-pushing the same rows produces the same result.
 *
 * For `deposits` and `withdrawals`, the upsert is wrapped in a single
 * transactional statement that ALSO creates notification outbox events for
 * freshly inserted, non-cancelled rows (see notifications/events.ts). The
 * transaction and its notification event commit atomically, and the
 * `(xmax = 0)` insert-detection + UNIQUE (type, entity_id) constraint make
 * event creation idempotent across sync retries.
 *
 * Body: { rows: Record<string, unknown>[] }
 * Response: { success: true, syncedIds: string[] }
 */
router.post('/sync/:table', requireApiKey, async (req, res, next) => {
  try {
    const tableName = req.params.table as SyncableTableName;
    if (!SYNCABLE_TABLES.includes(tableName)) {
      res.status(404).json({ code: 'UNKNOWN_TABLE', message: `Table '${tableName}' is not syncable.` });
      return;
    }

    const parsed = syncBodySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ code: 'VALIDATION_ERROR', message: parsed.error.message });
      return;
    }

    const rows = parsed.data.rows;
    if (!rows.length) {
      res.json({ success: true, syncedIds: [] });
      return;
    }

    // Build column list from the first row (all rows should have the same shape)
    const columns = Object.keys(rows[0]);
    const updateColumns = columns.filter((c) => c !== 'id');

    // Build the query using sql template tag for proper parameterization.
    // Each value is interpolated via sql`${value}` which Drizzle parameterizes safely.
    const valuesChunks: ReturnType<typeof sql>[] = [];
    for (const row of rows) {
      const rowValues = columns.map((col) => sql`${row[col] ?? null}`);
      valuesChunks.push(sql`(${sql.join(rowValues, sql`, `)})`);
    }

    const query = isNotifiableTable(tableName)
      ? buildUpsertWithEvents({ tableName, columns, valuesChunks })
      : sql`INSERT INTO ${sql.identifier(tableName)} (${sql.raw(columns.map((c) => `"${c}"`).join(', '))}) VALUES ${sql.join(valuesChunks, sql`, `)} ON CONFLICT ("id") DO UPDATE SET ${sql.raw(updateColumns.map((c) => `"${c}" = EXCLUDED."${c}"`).join(', '))}`;

    await db.execute(query);

    if (isNotifiableTable(tableName)) {
      logEventCreation(tableName, rows.map((r) => String(r.id)));
    }

    res.json({ success: true, syncedIds: rows.map((r) => String(r.id)) });
  } catch (err) {
    next(err);
  }
});

export { router as syncRouter };
export { SYNCABLE_TABLES };
