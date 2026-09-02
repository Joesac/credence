import { Hono } from 'hono';
import { timingSafeEqual } from 'node:crypto';
import { runNotificationProcessor, getMaxAttempts, type ProcessorDeps } from '../notifications/processor';
import { repo } from '../notifications/repo';
import { processEvent } from '../notifications/notification-service';
import { notifLogger } from '../notifications/logger';
import { DEFAULT_BATCH_SIZE } from '../notifications/constants';

const router = new Hono();

const service: ProcessorDeps['service'] = { process: processEvent };

/**
 * Authorizes a processor invocation.
 *
 * `Authorization: Bearer <secret>` where the secret is
 * `NOTIFICATIONS_CRON_SECRET` (falling back to API_KEY). This matches the
 * Vercel CRON_SECRET convention (Vercel forwards the env var as the
 * Authorization header on cron requests) and also covers external cron
 * services (cron-job.org, EasyCron, GitHub Actions) and manual triggers.
 */
function bearerMatches(provided: string | undefined, expected: string): boolean {
  if (!provided || !provided.startsWith('Bearer ')) return false;
  const providedBuf = Buffer.from(provided.slice(7));
  const expectedBuf = Buffer.from(expected);
  return providedBuf.length === expectedBuf.length && timingSafeEqual(providedBuf, expectedBuf);
}

/**
 * GET /api/cron/notifications
 *
 * Serverless-friendly processor trigger. Invoked by a Cloudflare Cron Trigger
 * (or an external scheduler) at a fixed interval. Durability is in the
 * database: the request may finish or crash at any point; unprocessed events
 * remain PENDING and are picked up later.
 *
 * Query params (optional): `limit` (batch size, max 100) and `batches`
 * (number of consecutive batches to drain, max 5).
 */
router.get('/cron/notifications', async (c) => {
  const expected = process.env.NOTIFICATIONS_CRON_SECRET ?? process.env.API_KEY;
  if (!expected || !bearerMatches(c.req.header('authorization'), expected)) {
    return c.json({ code: 'UNAUTHORIZED', message: 'Not authorized.' }, 401);
  }

  const limit = Math.min(Math.max(Number.parseInt(c.req.query('limit') ?? '', 10) || DEFAULT_BATCH_SIZE, 1), 100);
  const batches = Math.min(Math.max(Number.parseInt(c.req.query('batches') ?? '', 10) || 1, 1), 5);

  const totals = { claimed: 0, sent: 0, skipped: 0, requeued: 0, failed: 0 };
  for (let i = 0; i < batches; i += 1) {
    const report = await runNotificationProcessor(
      { repo, service, maxAttempts: getMaxAttempts() },
      limit,
    );
    totals.claimed += report.claimed;
    totals.sent += report.sent;
    totals.skipped += report.skipped;
    totals.requeued += report.requeued;
    totals.failed += report.failed;
    if (report.claimed === 0) break;
  }

  notifLogger.info('cron_notifications_run', totals);
  return c.json({ success: true, ...totals });
});

export { router as cronRouter };
