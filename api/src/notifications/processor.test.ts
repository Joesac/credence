import { beforeEach, describe, expect, it, vi } from 'vitest';
import { OneSignalError } from './onesignal-service';
import { runNotificationProcessor, type ProcessorDeps, type ProcessReport } from './processor';
import type { ClaimedEventRow } from './repo';

function makeEvent(overrides: Partial<ClaimedEventRow> = {}): ClaimedEventRow {
  return {
    id: 'evt-1',
    type: 'DEPOSIT_CREATED',
    member_id: 'member-1',
    entity_id: 'dep-1',
    payload: { entityId: 'dep-1' },
    attempt_count: 0,
    ...overrides,
  };
}

function makeDeps(overrides: Partial<ProcessorDeps> = {}): {
  deps: ProcessorDeps;
  repo: { claim: ReturnType<typeof vi.fn>; markProcessed: ReturnType<typeof vi.fn>; requeue: ReturnType<typeof vi.fn>; fail: ReturnType<typeof vi.fn> };
  service: { process: ReturnType<typeof vi.fn> };
} {
  const repo = {
    claim: vi.fn().mockResolvedValue([]),
    markProcessed: vi.fn().mockResolvedValue(undefined),
    requeue: vi.fn().mockResolvedValue(undefined),
    fail: vi.fn().mockResolvedValue(undefined),
  };
  const service = { process: vi.fn().mockResolvedValue('sent' as const) };
  return {
    deps: { repo, service, maxAttempts: 5, ...overrides },
    repo,
    service,
  };
}

describe('NotificationEventProcessor', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('claims pending events and marks them SENT on success', async () => {
    const { deps, repo, service } = makeDeps();
    repo.claim.mockResolvedValue([makeEvent()]);
    service.process.mockResolvedValue('sent');

    const report = await runNotificationProcessor(deps);

    expect(report).toMatchObject<ProcessReport>({ claimed: 1, sent: 1, skipped: 0, requeued: 0, failed: 0 });
    expect(repo.markProcessed).toHaveBeenCalledWith('evt-1', 'SENT');
    expect(repo.requeue).not.toHaveBeenCalled();
    expect(repo.fail).not.toHaveBeenCalled();
  });

  it('marks SKIPPED when the service suppresses the notification (preferences)', async () => {
    const { deps, repo, service } = makeDeps();
    repo.claim.mockResolvedValue([makeEvent()]);
    service.process.mockResolvedValue('skipped');

    await runNotificationProcessor(deps);

    expect(repo.markProcessed).toHaveBeenCalledWith('evt-1', 'SKIPPED');
    expect(repo.fail).not.toHaveBeenCalled();
  });

  it('requeues transient failures with the next attempt count', async () => {
    const { deps, repo, service } = makeDeps();
    repo.claim.mockResolvedValue([makeEvent({ attempt_count: 0 })]);
    service.process.mockRejectedValue(new OneSignalError('timeout', 'transient'));

    const report = await runNotificationProcessor(deps);

    expect(repo.requeue).toHaveBeenCalledWith('evt-1', 1, 'timeout');
    expect(repo.fail).not.toHaveBeenCalled();
    expect(report).toMatchObject({ claimed: 1, requeued: 1 });
  });

  it('fails the event permanently when retries are exhausted', async () => {
    const { deps, repo, service } = makeDeps();
    repo.claim.mockResolvedValue([makeEvent({ attempt_count: 4 })]);
    service.process.mockRejectedValue(new OneSignalError('still down', 'transient'));

    const report = await runNotificationProcessor(deps);

    expect(repo.requeue).not.toHaveBeenCalled();
    expect(repo.fail).toHaveBeenCalledWith('evt-1', 'still down');
    expect(report).toMatchObject({ claimed: 1, failed: 1 });
  });

  it('fails immediately on permanent errors (no retries)', async () => {
    const { deps, repo, service } = makeDeps();
    repo.claim.mockResolvedValue([makeEvent({ attempt_count: 0 })]);
    service.process.mockRejectedValue(new OneSignalError('invalid app id', 'permanent'));

    await runNotificationProcessor(deps);

    expect(repo.requeue).not.toHaveBeenCalled();
    expect(repo.fail).toHaveBeenCalledWith('evt-1', 'invalid app id');
  });

  it('respects a custom maxAttempts', async () => {
    const { deps, repo, service } = makeDeps();
    deps.maxAttempts = 2;
    repo.claim.mockResolvedValue([makeEvent({ attempt_count: 1 })]);
    service.process.mockRejectedValue(new OneSignalError('down', 'transient'));

    await runNotificationProcessor(deps);

    expect(repo.fail).toHaveBeenCalledTimes(1);
  });

  it('does nothing when there are no eligible events', async () => {
    const { deps, repo, service } = makeDeps();
    repo.claim.mockResolvedValue([]);

    const report = await runNotificationProcessor(deps);

    expect(report).toMatchObject<ProcessReport>({ claimed: 0, sent: 0, skipped: 0, requeued: 0, failed: 0 });
    expect(service.process).not.toHaveBeenCalled();
  });
});
