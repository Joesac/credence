import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SignJWT } from 'jose';
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

async function makeToken(): Promise<string> {
  return new SignJWT({ memberId: 'real-member', accountNumber: 'ACC-1' })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('5m')
    .sign(new TextEncoder().encode(process.env.JWT_SECRET as string));
}

function authHeaders(token: string): Record<string, string> {
  return { authorization: `Bearer ${token}`, 'content-type': 'application/json' };
}

describe('POST /members/me/notifications/subscriptions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    chainInsert();
    chainDelete();
  });

  it('requires authentication', async () => {
    const res = await notificationsRouter.request('/members/me/notifications/subscriptions', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ subscriptionId: 'sub-1' }),
    });

    expect(res.status).toBe(401);
    expect(mocks.insert).not.toHaveBeenCalled();
  });

  it('registers the subscription under the AUTHENTICATED member id', async () => {
    const token = await makeToken();
    // Attempt to register for someone else's member id — must be ignored.
    const res = await notificationsRouter.request('/members/me/notifications/subscriptions', {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify({ subscriptionId: 'sub-1', pushToken: 'tok', platform: 'android', memberId: 'someone-else' }),
    });

    expect(res.status).toBe(200);
    expect(mocks.insert).toHaveBeenCalledTimes(1);
    const valuesCall = mocks.insert.mock.results[0].value.values.mock.calls[0] as [Record<string, unknown>];
    const values = valuesCall[0];
    expect(values.member_id).toBe('real-member');
    expect(values.subscription_id).toBe('sub-1');

    // The client-supplied member id never reaches the database.
    expect(JSON.stringify(values)).not.toContain('someone-else');
  });

  it('rejects invalid bodies', async () => {
    const token = await makeToken();
    const res = await notificationsRouter.request('/members/me/notifications/subscriptions', {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify({ pushToken: 'no-subscription-id' }),
    });

    expect(res.status).toBe(400);
    expect(mocks.insert).not.toHaveBeenCalled();
  });

  it('upserts idempotently on (member_id, subscription_id)', async () => {
    const token = await makeToken();
    const res = await notificationsRouter.request('/members/me/notifications/subscriptions', {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify({ subscriptionId: 'sub-1' }),
    });

    expect(res.status).toBe(200);
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
    const token = await makeToken();
    const res = await notificationsRouter.request('/members/me/notifications/subscriptions/sub-9', {
      method: 'DELETE',
      headers: { authorization: `Bearer ${token}` },
    });

    expect(res.status).toBe(200);
    expect(mocks.remove).toHaveBeenCalledTimes(1);
    const where = mocks.remove.mock.results[0].value.where;
    expect(where).toHaveBeenCalledTimes(1);
  });
});
