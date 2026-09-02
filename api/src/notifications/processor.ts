import { DEFAULT_BATCH_SIZE, DEFAULT_MAX_ATTEMPTS } from './constants';
import { notifLogger } from './logger';
import { OneSignalError } from './onesignal-service';
import type { ClaimedEventRow, NotificationEventRepo } from './repo';
import type { ProcessOutcome } from './notification-service';

/**
 * NotificationEventProcessor — owns the outbox state machine.
 *
 *   PENDING → PROCESSING → SENT | SKIPPED
 *                  │
 *                  ├─ transient failure → PENDING (attempt_count++, backoff)
 *                  └─ permanent failure or retries exhausted → FAILED
 *
 * Safe on Vercel: every run is triggered by a cron HTTP request; durability
 * lives in the database, not in a long-running process.
 */

export interface NotificationServiceLike {
  process(event: ClaimedEventRow): Promise<ProcessOutcome>;
}

export interface ProcessorDeps {
  repo: Pick<NotificationEventRepo, 'claim' | 'markProcessed' | 'requeue' | 'fail'>;
  service: NotificationServiceLike;
  maxAttempts?: number;
}

export interface ProcessReport {
  claimed: number;
  sent: number;
  skipped: number;
  requeued: number;
  failed: number;
}

export function getMaxAttempts(): number {
  const raw = process.env.NOTIFICATIONS_MAX_ATTEMPTS;
  if (!raw) return DEFAULT_MAX_ATTEMPTS;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_MAX_ATTEMPTS;
}

export async function runNotificationProcessor(
  deps: ProcessorDeps,
  batchSize: number = DEFAULT_BATCH_SIZE,
): Promise<ProcessReport> {
  const maxAttempts = deps.maxAttempts ?? getMaxAttempts();
  const claimed = await deps.repo.claim(batchSize);

  const report: ProcessReport = { claimed: claimed.length, sent: 0, skipped: 0, requeued: 0, failed: 0 };

  for (const event of claimed) {
    const attempt = event.attempt_count + 1;
    notifLogger.info('notification_processing_started', {
      eventId: event.id,
      type: event.type,
      memberId: event.member_id,
      entityId: event.entity_id,
      attempt,
    });

    try {
      const outcome = await deps.service.process(event);
      await deps.repo.markProcessed(event.id, outcome === 'sent' ? 'SENT' : 'SKIPPED');
      report[outcome === 'sent' ? 'sent' : 'skipped'] += 1;
      notifLogger.info('notification_processed', {
        eventId: event.id,
        outcome,
        attempt,
      });
    } catch (err) {
      const failure =
        err instanceof OneSignalError
          ? err
          : new OneSignalError(err instanceof Error ? err.message : 'Unknown processing error', 'transient');

      if (failure.kind === 'transient' && attempt < maxAttempts) {
        await deps.repo.requeue(event.id, attempt, failure.message);
        report.requeued += 1;
        notifLogger.warn('notification_retry_scheduled', {
          eventId: event.id,
          attempt,
          nextAttempt: attempt + 1,
        });
      } else {
        await deps.repo.fail(event.id, failure.message);
        report.failed += 1;
        notifLogger.error('notification_failed', {
          eventId: event.id,
          attempt,
          kind: failure.kind,
        });
      }
    }
  }

  if (claimed.length > 0) {
    notifLogger.info('notification_batch_completed', {
      claimed: report.claimed,
      sent: report.sent,
      skipped: report.skipped,
      requeued: report.requeued,
      failed: report.failed,
    });
  }

  return report;
}
