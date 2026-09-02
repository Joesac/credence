import { Hono } from 'hono';
import { SignJWT, jwtVerify } from 'jose';
import { z } from 'zod';
import { eq, and, sql } from 'drizzle-orm';
import { db } from '../../db';
import { members } from '../../db/schema';
import { verifyPassword } from '../utils/password';

const router = new Hono();

const loginSchema = z.object({
  accountNumber: z.string().min(1),
  password: z.string().min(1),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

function getSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET is not configured');
  return secret;
}

async function signTokens(memberId: string, accountNumber: string) {
  const secret = new TextEncoder().encode(getSecret());
  const accessToken = await new SignJWT({ memberId, accountNumber })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('15m')
    .sign(secret);
  const refreshToken = await new SignJWT({ memberId, accountNumber, type: 'refresh' })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('30d')
    .sign(secret);
  return { accessToken, refreshToken };
}

/**
 * POST /api/auth/login
 *
 * Authenticates a member with account number + password.
 * Returns the member profile and JWT access/refresh tokens.
 *
 * Body: { accountNumber: string, password: string }
 * Response: { member: Member, tokens: { accessToken, refreshToken } }
 */
router.post('/auth/login', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ code: 'VALIDATION_ERROR', message: parsed.error.message }, 400);
  }

  const { accountNumber, password } = parsed.data;
  const normalized = accountNumber.trim();

  const [member] = await db
    .select({
      id: members.id,
      fullname: members.fullname,
      account_number: members.account_number,
      telephoneNumber: members.telephoneNumber,
      location: members.location,
      password: members.password,
      date_created: members.date_created,
      date_updated: members.date_updated,
      is_disabled: members.is_disabled,
    })
    .from(members)
    .where(
      and(
        sql`lower(${members.account_number}) = lower(${normalized})`,
        eq(members.is_deleted, false),
      ),
    );

  if (!member || member.is_disabled) {
    return c.json({ code: 'UNAUTHORIZED', message: 'Invalid account number or password.' }, 401);
  }

  if (!member.password || !verifyPassword(password, member.password)) {
    return c.json({ code: 'UNAUTHORIZED', message: 'Invalid account number or password.' }, 401);
  }

  const tokens = await signTokens(member.id, member.account_number);

  const { password: _pw, is_disabled: _disabled, ...safeMember } = member;

  return c.json({ member: safeMember, tokens });
});

/**
 * POST /api/auth/refresh
 *
 * Exchanges a valid refresh token for a new access/refresh token pair.
 *
 * Body: { refreshToken: string }
 * Response: { accessToken: string, refreshToken: string }
 */
router.post('/auth/refresh', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const parsed = refreshSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ code: 'VALIDATION_ERROR', message: parsed.error.message }, 400);
  }

  const secret = new TextEncoder().encode(getSecret());
  try {
    const { payload } = await jwtVerify(parsed.data.refreshToken, secret);
    if (payload.type !== 'refresh') {
      return c.json({ code: 'UNAUTHORIZED', message: 'Invalid refresh token.' }, 401);
    }

    const tokens = await signTokens(payload.memberId as string, (payload.accountNumber as string) ?? '');
    return c.json(tokens);
  } catch {
    return c.json({ code: 'UNAUTHORIZED', message: 'Refresh token expired or invalid.' }, 401);
  }
});

export { router as authRouter };
