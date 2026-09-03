import { beforeEach, describe, expect, it, vi } from 'vitest';
import { sql } from 'drizzle-orm';
import { PgDialect } from 'drizzle-orm/pg-core';
import { syncRouter } from './sync';

const mocks = vi.hoisted(() => ({
  db: { execute: vi.fn() },
}));

vi.mock('../../db', () => ({ db: mocks.db }));

const dialect = new PgDialect();

const depositRow = {
  id: '11111111-1111-1111-1111-111111111111',
  transaction_id: 'DEP-2026-0001',
  member_id: '22222222-2222-2222-2222-222222222222',
  received_by: '33333333-3333-3333-3333-333333333333',
  payment_method: 'cash',
  amount: '500.00',
  refreshment_token: 1,
  notes: null,
  is_cancelled: false,
  date_created: '2026-08-31T10:00:00Z',
  date_updated: '2026-08-31T10:00:00Z',
  is_synced: false,
};

function syncRequest(path: string, body: unknown): Promise<Response> {
  return syncRouter.request(path, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${process.env.API_KEY}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify(body),
  });
}

describe('POST /sync/:table (notification outbox integration)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.db.execute.mockResolvedValue({ rows: [] });
  });

  it('wraps deposit upserts in the atomic outbox statement', async () => {
    const res = await syncRequest('/sync/deposits', { rows: [depositRow] });

    expect(res.status).toBe(200);
    expect(mocks.db.execute).toHaveBeenCalledTimes(1);
    const rendered = dialect.sqlToQuery(mocks.db.execute.mock.calls[0][0] as ReturnType<typeof sql>);
    expect(rendered.sql).toContain('WITH upserted AS');
    expect(rendered.sql).toContain('INSERT INTO "notification_events"');
    expect(rendered.sql).toContain('ON CONFLICT ("type", "entity_id") DO NOTHING');
  });

  it('wraps withdrawal upserts in the atomic outbox statement', async () => {
    const withdrawalRow = {
      id: '44444444-4444-4444-4444-444444444444',
      transaction_id: 'WDR-2026-0001',
      member_id: '22222222-2222-2222-2222-222222222222',
      issuer_id: '33333333-3333-3333-3333-333333333333',
      amount: '200.00',
      notes: null,
      is_cancelled: false,
      date_created: '2026-08-31T10:00:00Z',
      date_updated: '2026-08-31T10:00:00Z',
      is_synced: false,
    };
    const res = await syncRequest('/sync/withdrawals', {
      rows: [withdrawalRow],
    });

    expect(res.status).toBe(200);
    const rendered = dialect.sqlToQuery(mocks.db.execute.mock.calls[0][0] as ReturnType<typeof sql>);
    expect(rendered.params).toContain('WITHDRAWAL_CREATED');
    expect(rendered.params).toContain('withdrawal');
  });

  it('keeps non-notifiable tables on the plain idempotent upsert path', async () => {
    const res = await syncRequest('/sync/users', {
      rows: [{ id: '55555555-5555-5555-5555-555555555555', fullname: 'A', username: 'a', password: 'x' }],
    });

    expect(res.status).toBe(200);
    const rendered = dialect.sqlToQuery(mocks.db.execute.mock.calls[0][0] as ReturnType<typeof sql>);
    expect(rendered.sql).not.toContain('notification_events');
    expect(rendered.sql).toContain('INSERT INTO "users"');
    expect(rendered.sql).toContain('ON CONFLICT ("id") DO UPDATE');
  });

  it('preserves idempotent retry semantics for deposits (ON CONFLICT by id)', async () => {
    const res = await syncRequest('/sync/deposits', { rows: [depositRow] });

    expect(res.status).toBe(200);
    const rendered = dialect.sqlToQuery(mocks.db.execute.mock.calls[0][0] as ReturnType<typeof sql>);
    expect(rendered.sql).toContain('ON CONFLICT ("id") DO UPDATE');
    // Re-pushing the same row again produces the same statement — the
    // (xmax = 0) guard + UNIQUE(type, entity_id) prevent duplicate events.
    expect(rendered.sql).toContain('(xmax = 0) AS "__inserted"');
  });

  it('rejects unknown tables', async () => {
    const res = await syncRequest('/sync/unknown_table', { rows: [depositRow] });

    expect(res.status).toBe(404);
    expect(mocks.db.execute).not.toHaveBeenCalled();
  });

  it('rejects batches over 100 rows', async () => {
    const rows = Array.from({ length: 101 }, (_, i) => ({ ...depositRow, id: `id-${i}` }));
    const res = await syncRequest('/sync/deposits', { rows });

    expect(res.status).toBe(400);
    expect(mocks.db.execute).not.toHaveBeenCalled();
  });

  it('rejects requests without a valid API key', async () => {
    const res = await syncRouter.request('/sync/deposits', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ rows: [depositRow] }),
    });

    expect(res.status).toBe(401);
    expect(mocks.db.execute).not.toHaveBeenCalled();
  });

  it('rejects rows with unknown columns (SQL injection prevention)', async () => {
    const res = await syncRequest('/sync/deposits', {
      rows: [{ ...depositRow, 'malicious"; DROP TABLE--': 'x' }],
    });

    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ code: 'VALIDATION_ERROR' });
    expect(mocks.db.execute).not.toHaveBeenCalled();
  });
});
