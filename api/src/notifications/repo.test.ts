import { beforeEach, describe, expect, it, vi } from 'vitest';
import { sql } from 'drizzle-orm';
import { PgDialect } from 'drizzle-orm/pg-core';
import { claimEvents } from './repo';

const mocks = vi.hoisted(() => ({
  db: { execute: vi.fn() },
}));

vi.mock('../../db', () => ({ db: mocks.db }));

const dialect = new PgDialect();

describe('claimEvents (concurrency-safe claiming)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('claims with FOR UPDATE SKIP LOCKED so overlapping workers never double-process', async () => {
    mocks.db.execute.mockResolvedValue({ rows: [] });

    await claimEvents(20);

    const rendered = dialect.sqlToQuery(mocks.db.execute.mock.calls[0][0] as ReturnType<typeof sql>);
    expect(rendered.sql).toContain('FOR UPDATE SKIP LOCKED');
    expect(rendered.sql).toContain('"status" = $1 AND "available_at" <= now()');
    expect(rendered.sql).toContain('"status" = $2');
    expect(rendered.params).toContain('PENDING');
    expect(rendered.params).toContain('PROCESSING');
  });

  it('reclaims stale PROCESSING events (crashed processors)', async () => {
    mocks.db.execute.mockResolvedValue({ rows: [] });

    await claimEvents(20);

    const rendered = dialect.sqlToQuery(mocks.db.execute.mock.calls[0][0] as ReturnType<typeof sql>);
    expect(rendered.sql).toContain("interval '5 minutes'");
    expect(rendered.sql).toContain('"claimed_at" < now()');
  });

  it('atomically flips claimed rows to PROCESSING and returns normalized rows', async () => {
    mocks.db.execute.mockResolvedValue({
      rows: [
        { id: 'evt-1', type: 'DEPOSIT_CREATED', member_id: 'm1', entity_id: 'd1', payload: { entityId: 'd1' }, attempt_count: 2 },
      ],
    });

    const events = await claimEvents(10);

    expect(events).toEqual([
      { id: 'evt-1', type: 'DEPOSIT_CREATED', member_id: 'm1', entity_id: 'd1', payload: { entityId: 'd1' }, attempt_count: 2 },
    ]);
  });

  it('bounds the batch size', async () => {
    mocks.db.execute.mockResolvedValue({ rows: [] });

    await claimEvents(5);

    const rendered = dialect.sqlToQuery(mocks.db.execute.mock.calls[0][0] as ReturnType<typeof sql>);
    expect(rendered.sql).toContain('LIMIT $3');
    expect(rendered.params).toContain(5);
  });
});
