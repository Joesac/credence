import { Router, type Request } from 'express';
import { timingSafeEqual } from 'crypto';
import { runNotificationProcessor, getMaxAttempts, type ProcessorDeps } from '../notifications/processor';
import { repo } from '../notifications/repo';
import { processEvent } from '../notifications/notification-service';
import { notifLogger } from '../notifications/logger';
import { DEFAULT_BATCH_SIZE } from '../notifications/constants';

const router = Router();

const service: ProcessorDeps['service'] = { process: processEvent };

/**
 * Authorizes a processor invocation.
 *
 * Primary: `Authorization: Bearer <secret>` where the secret is
 * `NOTIFICATIONS_CRON_SECRET` (falling back to API_KEY). This matches
 * Vercel's recommended CRON_SECRET pattern — when the Vercel project has a
 * `CRON_SECRET` env var, Vercel forwards it as the Authorization header on
 * every cron invocation — and also covers manual/dev triggers.
 *
 * Secondary: Vercel cron requests also carry cron headers
 * (`x-vercel-cron: 1` and/or `x-vercel-cron-schedule`). These are treated as
 * a convenience signal only, since they are not credentials.
 */
function bearerMatches(provided: string | undefined, expected: string): boolean {
  if (!provided || !provided.startsWith('Bearer ')) return false;
  const providedBuf = Buffer.from(provided.slice(7));
  const expectedBuf = Buffer.from(expected);
  return providedBuf.length === expectedBuf.length && timingSafeEqual(providedBuf, expectedBuf);
}

function isAuthorized(req: Request): boolean {
  const expected = process.env.NOTIFICATIONS_CRON_SECRET ?? process.env.API_KEY;
  if (expected && bearerMatches(req.headers.authorization, expected)) return true;

  const isVercelCron =
    req.headers['x-vercel-cron'] === '1' || typeof req.headers['x-vercel-cron-schedule'] === 'string';
  return isVercelCron;
}

/**
 * GET /api/cron/notifications
 *
 * Serverless-friendly processor trigger (Vercel cron, every minute).
 * Durability is in the database: the request may finish or crash at any
 * point; unprocessed events remain PENDING and are picked up later.
 *
 * Query params (optional): `limit` (batch size, max 100) and `batches`
 * (number of consecutive batches to drain, max 5).
 */
router.get('/cron/notifications', async (req, res, next) => {
  if (!isAuthorized(req)) {
    res.status(401).json({ code: 'UNAUTHORIZED', message: 'Not authorized.' });
    return;
  }

  try {
    const limit = Math.min(Math.max(Number.parseInt(String(req.query.limit ?? ''), 10) || DEFAULT_BATCH_SIZE, 1), 100);
    const batches = Math.min(Math.max(Number.parseInt(String(req.query.batches ?? ''), 10) || 1, 1), 5);

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
    res.json({ success: true, ...totals });
  } catch (err) {
    next(err);
  }
});

export { router as cronRouter };
