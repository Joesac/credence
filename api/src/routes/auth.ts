import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { eq, and } from 'drizzle-orm';
import { db } from '../../db';
import { members } from '../../db/schema';
import { verifyPassword } from '../utils/password';

const router = Router();

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

function signTokens(memberId: string, accountNumber: string) {
  const secret = getSecret();
  const accessToken = jwt.sign({ memberId, accountNumber }, secret, {
    expiresIn: '15m',
  });
  const refreshToken = jwt.sign({ memberId, accountNumber, type: 'refresh' }, secret, {
    expiresIn: '30d',
  });
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
router.post('/auth/login', async (req, res, next) => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ code: 'VALIDATION_ERROR', message: parsed.error.message });
      return;
    }

    const { accountNumber, password } = parsed.data;

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
      .where(and(eq(members.account_number, accountNumber), eq(members.is_deleted, false)));

    if (!member || member.is_disabled) {
      res.status(401).json({ code: 'UNAUTHORIZED', message: 'Invalid account number or password.' });
      return;
    }

    if (!member.password || !verifyPassword(password, member.password)) {
      res.status(401).json({ code: 'UNAUTHORIZED', message: 'Invalid account number or password.' });
      return;
    }

    const tokens = signTokens(member.id, member.account_number);

    const { password: _pw, is_disabled: _disabled, ...safeMember } = member;

    res.json({ member: safeMember, tokens });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/auth/refresh
 *
 * Exchanges a valid refresh token for a new access/refresh token pair.
 *
 * Body: { refreshToken: string }
 * Response: { accessToken: string, refreshToken: string }
 */
router.post('/auth/refresh', async (req, res, next) => {
  try {
    const parsed = refreshSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ code: 'VALIDATION_ERROR', message: parsed.error.message });
      return;
    }

    const secret = getSecret();
    try {
      const decoded = jwt.verify(parsed.data.refreshToken, secret) as {
        memberId: string;
        accountNumber: string;
        type?: string;
      };

      if (decoded.type !== 'refresh') {
        res.status(401).json({ code: 'UNAUTHORIZED', message: 'Invalid refresh token.' });
        return;
      }

      const tokens = signTokens(decoded.memberId, decoded.accountNumber);
      res.json(tokens);
    } catch {
      res.status(401).json({ code: 'UNAUTHORIZED', message: 'Refresh token expired or invalid.' });
    }
  } catch (err) {
    next(err);
  }
});

export { router as authRouter };
