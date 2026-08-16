import { Router } from 'express';
import { sql } from 'drizzle-orm';
import { db } from '../../db';

const router = Router();

/**
 * GET /api/health
 *
 * Returns API + database connectivity status.
 */
router.get('/health', async (_req, res) => {
  try {
    await db.execute(sql`SELECT 1`);
    res.json({ status: 'ok', db: 'ok' });
  } catch (err) {
    console.error('[Health] DB check failed:', err);
    res.status(503).json({ status: 'ok', db: 'error' });
  }
});

export { router as healthRouter };
