import { Hono } from 'hono';
import { z } from 'zod';
import { requireApiKey } from '../middleware/auth';
import { sql } from 'drizzle-orm';
import { db } from '../../db';
import { TABLE_REGISTRY, type SyncableTableName } from '../../db/schema';
import { buildUpsertWithEvents, isNotifiableTable, logEventCreation } from '../notifications/events';

const router = new Hono();

const SYNCABLE_TABLES = Object.keys(TABLE_REGISTRY) as SyncableTableName[];

const syncBodySchema = z.object({
  rows: z.array(z.record(z.string(), z.unknown())).max(100, { message: 'Maximum 100 rows per batch.' }),
});

/**
 * Allowed column names per syncable table, derived from the Drizzle schema.
 * The sync route only accepts columns that exist in the cloud DB schema,
 * preventing SQL injection through user-supplied column identifiers.
 */
const ALLOWED_COLUMNS: Record<SyncableTableName, Set<string>> = Object.fromEntries(
  (Object.entries(TABLE_REGISTRY) as [SyncableTableName, (typeof TABLE_REGISTRY)[SyncableTableName]][]).map(
    ([name, table]) => [name, new Set(Object.keys(table))] as const,
  ),
) as Record<SyncableTableName, Set<string>>;

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
router.post('/sync/:table', requireApiKey, async (c) => {
  const tableName = c.req.param('table') as SyncableTableName;
  if (!SYNCABLE_TABLES.includes(tableName)) {
    return c.json({ code: 'UNKNOWN_TABLE', message: `Table '${tableName}' is not syncable.` }, 404);
  }

  const body = await c.req.json().catch(() => ({}));
  const parsed = syncBodySchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ code: 'VALIDATION_ERROR', message: parsed.error.message }, 400);
  }

  const rows = parsed.data.rows;
  if (!rows.length) {
    return c.json({ success: true, syncedIds: [] });
  }

  // Build column list from the first row (all rows should have the same shape)
  const columns = Object.keys(rows[0]);
  const allowed = ALLOWED_COLUMNS[tableName];
  const invalid = columns.filter((col) => !allowed.has(col));
  if (invalid.length) {
    return c.json(
      { code: 'VALIDATION_ERROR', message: `Unknown column(s) for '${tableName}': ${invalid.join(', ')}` },
      400,
    );
  }
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
    : sql`INSERT INTO ${sql.identifier(tableName)} (${sql.raw(columns.map((col) => `"${col}"`).join(', '))}) VALUES ${sql.join(valuesChunks, sql`, `)} ON CONFLICT ("id") DO UPDATE SET ${sql.raw(updateColumns.map((col) => `"${col}" = EXCLUDED."${col}"`).join(', '))}`;

  await db.execute(query);

  if (isNotifiableTable(tableName)) {
    logEventCreation(tableName, rows.map((r) => String(r.id)));
  }

  return c.json({ success: true, syncedIds: rows.map((r) => String(r.id)) });
});

export { router as syncRouter };
export { SYNCABLE_TABLES };
