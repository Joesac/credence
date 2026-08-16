import { Router } from 'express';
import { z } from 'zod';
import { sql } from 'drizzle-orm';
import { db } from '../../db';
import { TABLE_REGISTRY, type SyncableTableName } from '../../db/schema';

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
 * Body: { rows: Record<string, unknown>[] }
 * Response: { success: true, syncedIds: string[] }
 */
router.post('/sync/:table', async (req, res, next) => {
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

    const columnList = columns.map((c) => `"${c}"`).join(', ');
    const conflictSet = updateColumns
      .map((c) => `"${c}" = EXCLUDED."${c}"`)
      .join(', ');

    // Build the query using sql template tag for proper parameterization.
    // Each value is interpolated via sql`${value}` which Drizzle parameterizes safely.
    const valuesChunks: ReturnType<typeof sql>[] = [];
    for (const row of rows) {
      const rowValues = columns.map((col) => sql`${row[col] ?? null}`);
      valuesChunks.push(sql`(${sql.join(rowValues, sql`, `)})`);
    }

    const query = sql`INSERT INTO ${sql.identifier(tableName)} (${sql.raw(columnList)}) VALUES ${sql.join(valuesChunks, sql`, `)} ON CONFLICT ("id") DO UPDATE SET ${sql.raw(conflictSet)}`;

    await db.execute(query);

    res.json({ success: true, syncedIds: rows.map((r) => String(r.id)) });
  } catch (err) {
    next(err);
  }
});

export { router as syncRouter };
export { SYNCABLE_TABLES };
