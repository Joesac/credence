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

function isAuthorized(req: Request): boolean {
  const expected = process.env.NOTIFICATIONS_CRON_SECRET ?? process.env.API_KEY;
  return !!expected && bearerMatches(req.headers.authorization, expected);
}

/**
 * GET /api/cron/notifications
 *
 * Serverless-friendly processor trigger. Vercel's Hobby plan does not allow
 * cron jobs, so this endpoint is invoked by an external scheduler
 * (cron-job.org, EasyCron, GitHub Actions) or manually.
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
