import { beforeEach, describe, expect, it, vi } from 'vitest';
import jwt from 'jsonwebtoken';
import type { NextFunction, Request, Response } from 'express';
import { notificationsRouter } from './notifications';

const mocks = vi.hoisted(() => {
  const insert = vi.fn();
  const remove = vi.fn();
  const db = { insert, delete: remove };
  return { db, insert, remove };
});

vi.mock('../../db', () => ({ db: mocks.db }));

function chainInsert() {
  mocks.insert.mockReturnValue({
    values: vi.fn().mockReturnValue({
      onConflictDoUpdate: vi.fn().mockResolvedValue(undefined),
    }),
  });
}

function chainDelete() {
  mocks.remove.mockReturnValue({
    where: vi.fn().mockResolvedValue(undefined),
  });
}

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

function makeReq(overrides: Partial<Request> = {}): Request {
  const token = jwt.sign({ memberId: 'real-member', accountNumber: 'ACC-1' }, process.env.JWT_SECRET as string, {
    expiresIn: '5m',
  });
  return {
    method: 'POST',
    url: '/members/me/notifications/subscriptions',
    headers: { authorization: `Bearer ${token}` },
    body: {},
    params: {},
    query: {},
    ...overrides,
  } as Request;
}

function invoke(req: Request, res: Response): Promise<void> {
  const next = vi.fn() as unknown as NextFunction;
  return new Promise((resolve) => {
    (notificationsRouter as unknown as (r: Request, s: Response, n: NextFunction) => void)(req, res, next);
    // Express dispatch is synchronous for these handlers.
    resolve();
  });
}

describe('POST /members/me/notifications/subscriptions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    chainInsert();
    chainDelete();
  });

  it('requires authentication', async () => {
    const res = makeRes();
    const req = makeReq({ headers: {} });

    await invoke(req, res);

    expect(res.statusCode).toBe(401);
    expect(mocks.insert).not.toHaveBeenCalled();
  });

  it('registers the subscription under the AUTHENTICATED member id', async () => {
    const res = makeRes();
    // Attempt to register for someone else's member id — must be ignored.
    const req = makeReq({ body: { subscriptionId: 'sub-1', pushToken: 'tok', platform: 'android', memberId: 'someone-else' } });

    await invoke(req, res);

    expect(res.statusCode).toBe(200);
    expect(mocks.insert).toHaveBeenCalledTimes(1);
    const valuesCall = mocks.insert.mock.results[0].value.values.mock.calls[0] as [Record<string, unknown>];
    const values = valuesCall[0];
    expect(values.member_id).toBe('real-member');
    expect(values.subscription_id).toBe('sub-1');

    // The client-supplied member id never reaches the database.
    expect(JSON.stringify(values)).not.toContain('someone-else');
  });

  it('rejects invalid bodies', async () => {
    const res = makeRes();
    const req = makeReq({ body: { pushToken: 'no-subscription-id' } });

    await invoke(req, res);

    expect(res.statusCode).toBe(400);
    expect(mocks.insert).not.toHaveBeenCalled();
  });

  it('upserts idempotently on (member_id, subscription_id)', async () => {
    const res = makeRes();
    const req = makeReq({ body: { subscriptionId: 'sub-1' } });

    await invoke(req, res);

    const upsert = mocks.insert.mock.results[0].value.values.mock.results[0].value.onConflictDoUpdate;
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        target: expect.any(Array),
        set: expect.objectContaining({ status: 'active' }),
      }),
    );
  });
});

describe('DELETE /members/me/notifications/subscriptions/:subscriptionId', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    chainInsert();
    chainDelete();
  });

  it('deletes only the authenticated member\'s subscription', async () => {
    const res = makeRes();
    const req = makeReq({
      method: 'DELETE',
      url: '/members/me/notifications/subscriptions/sub-9',
      params: { subscriptionId: 'sub-9' },
    });

    await invoke(req, res);

    expect(res.statusCode).toBe(200);
    expect(mocks.remove).toHaveBeenCalledTimes(1);
    const where = mocks.remove.mock.results[0].value.where;
    expect(where).toHaveBeenCalledTimes(1);
  });
});
