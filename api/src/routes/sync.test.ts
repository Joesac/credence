import { beforeEach, describe, expect, it, vi } from 'vitest';
import { sql } from 'drizzle-orm';
import { PgDialect } from 'drizzle-orm/pg-core';
import type { NextFunction, Request, Response } from 'express';
import { syncRouter } from './sync';

const mocks = vi.hoisted(() => ({
  db: { execute: vi.fn() },
}));

vi.mock('../../db', () => ({ db: mocks.db }));

const dialect = new PgDialect();

function makeRes() {
  const res = {} as Response & { statusCode: number; body: unknown };
  res.statusCode = 200;
  res.body = undefined;
  res.status = ((code: number) => {
    res.statusCode = code;
    return res;
  }) as Response['status'];
  res.json = ((body: unknown) => {
    res.body = body;
    return res;
  }) as Response['json'];
  res.setHeader = (() => res) as Response['setHeader'];
  res.end = (() => res) as unknown as Response['end'];
  return res;
}

function makeReq(url: string, body: unknown): Request {
  return {
    method: 'POST',
    url,
    headers: { authorization: `Bearer ${process.env.API_KEY}` },
    body,
    params: {},
    query: {},
  } as Request;
}

function invoke(req: Request, res: Response): Promise<void> {
  const next = vi.fn() as unknown as NextFunction;
  return new Promise((resolve) => {
    (syncRouter as unknown as (r: Request, s: Response, n: NextFunction) => void)(req, res, next);
    resolve();
  });
}

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

describe('POST /sync/:table (notification outbox integration)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.db.execute.mockResolvedValue({ rows: [] });
  });

  it('wraps deposit upserts in the atomic outbox statement', async () => {
    const res = makeRes();
    const req = makeReq('/sync/deposits', { rows: [depositRow] });

    await invoke(req, res);

    expect(res.statusCode).toBe(200);
    expect(mocks.db.execute).toHaveBeenCalledTimes(1);
    const rendered = dialect.sqlToQuery(mocks.db.execute.mock.calls[0][0] as ReturnType<typeof sql>);
    expect(rendered.sql).toContain('WITH upserted AS');
    expect(rendered.sql).toContain('INSERT INTO "notification_events"');
    expect(rendered.sql).toContain('ON CONFLICT ("type", "entity_id") DO NOTHING');
  });

  it('wraps withdrawal upserts in the atomic outbox statement', async () => {
    const res = makeRes();
    const req = makeReq('/sync/withdrawals', {
      rows: [{ ...depositRow, id: '44444444-4444-4444-4444-444444444444', transaction_id: 'WDR-2026-0001', amount: '200.00' }],
    });

    await invoke(req, res);

    const rendered = dialect.sqlToQuery(mocks.db.execute.mock.calls[0][0] as ReturnType<typeof sql>);
    expect(rendered.params).toContain('WITHDRAWAL_CREATED');
    expect(rendered.params).toContain('withdrawal');
  });

  it('keeps non-notifiable tables on the plain idempotent upsert path', async () => {
    const res = makeRes();
    const req = makeReq('/sync/users', {
      rows: [{ id: '55555555-5555-5555-5555-555555555555', fullname: 'A', username: 'a', password: 'x' }],
    });

    await invoke(req, res);

    const rendered = dialect.sqlToQuery(mocks.db.execute.mock.calls[0][0] as ReturnType<typeof sql>);
    expect(rendered.sql).not.toContain('notification_events');
    expect(rendered.sql).toContain('INSERT INTO "users"');
    expect(rendered.sql).toContain('ON CONFLICT ("id") DO UPDATE');
  });

  it('preserves idempotent retry semantics for deposits (ON CONFLICT by id)', async () => {
    const res = makeRes();
    const req = makeReq('/sync/deposits', { rows: [depositRow] });

    await invoke(req, res);

    const rendered = dialect.sqlToQuery(mocks.db.execute.mock.calls[0][0] as ReturnType<typeof sql>);
    expect(rendered.sql).toContain('ON CONFLICT ("id") DO UPDATE');
    // Re-pushing the same row again produces the same statement — the
    // (xmax = 0) guard + UNIQUE(type, entity_id) prevent duplicate events.
    expect(rendered.sql).toContain('(xmax = 0) AS "__inserted"');
  });

  it('rejects unknown tables', async () => {
    const res = makeRes();
    const req = makeReq('/sync/unknown_table', { rows: [depositRow] });

    await invoke(req, res);

    expect(res.statusCode).toBe(404);
    expect(mocks.db.execute).not.toHaveBeenCalled();
  });

  it('rejects batches over 100 rows', async () => {
    const res = makeRes();
    const rows = Array.from({ length: 101 }, (_, i) => ({ ...depositRow, id: `id-${i}` }));
    const req = makeReq('/sync/deposits', { rows });

    await invoke(req, res);

    expect(res.statusCode).toBe(400);
    expect(mocks.db.execute).not.toHaveBeenCalled();
  });
});
