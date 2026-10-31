import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PgDialect } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { adminRouter } from './admin';

const mocks = vi.hoisted(() => ({
  set: vi.fn(),
  where: vi.fn(),
  update: vi.fn(),
  hashPassword: vi.fn(),
}));

vi.mock('../../db', () => ({
  db: { update: mocks.update },
}));

vi.mock('../utils/password', () => ({
  hashPassword: mocks.hashPassword,
}));

const dialect = new PgDialect();
const memberId = '11111111-1111-4111-8111-111111111111';

function request(body: unknown): Promise<Response> {
  return adminRouter.request('/admin/members/mobile-passwords', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${process.env.API_KEY}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify(body),
  });
}

describe('POST /admin/members/mobile-passwords', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.hashPassword.mockImplementation(async (password: string) => `hashed-${password}`);
    mocks.where.mockResolvedValue({ rowCount: 2 });
    mocks.set.mockReturnValue({ where: mocks.where });
    mocks.update.mockReturnValue({ set: mocks.set });
  });

  it('uses one CASE-based SQL update for the whole batch', async () => {
    const res = await request({
      members: [
        { id: memberId, password: 'first-password' },
        { id: '22222222-2222-4222-8222-222222222222', password: 'second-password' },
      ],
    });

    expect(res.status).toBe(200);
    expect(mocks.update).toHaveBeenCalledTimes(1);
    expect(mocks.where).toHaveBeenCalledTimes(1);
    expect(mocks.set).toHaveBeenCalledTimes(1);

    const updateValues = mocks.set.mock.calls[0][0];
    const renderedPassword = dialect.sqlToQuery(updateValues.password as ReturnType<typeof sql>);
    expect(renderedPassword.sql).toContain('CASE id');
    expect(renderedPassword.params).toEqual(['11111111-1111-4111-8111-111111111111', 'hashed-first-password', '22222222-2222-4222-8222-222222222222', 'hashed-second-password']);
  });

  it('hashes every password before issuing the database update', async () => {
    const res = await request({
      members: [{ id: memberId, password: 'first-password' }],
    });

    expect(res.status).toBe(200);
    expect(mocks.hashPassword).toHaveBeenCalledWith('first-password');
    expect(mocks.update).toHaveBeenCalledTimes(1);
  });
});
