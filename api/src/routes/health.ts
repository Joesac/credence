import { Hono } from 'hono';
import { sql } from 'drizzle-orm';
import { db } from '../../db';

const router = new Hono();

/**
 * GET /api/health
 *
 * Returns API + database connectivity status.
 */
router.get('/health', async (c) => {
  try {
    await db.execute(sql`SELECT 1`);
    return c.json({ status: 'ok', db: 'ok' });
  } catch (err) {
    console.error('[Health] DB check failed:', err);
    return c.json({ status: 'ok', db: 'error' }, 503);
  }
});

export { router as healthRouter };
