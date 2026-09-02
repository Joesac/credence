import { jwtVerify } from 'jose';
import type { Context, MiddlewareHandler } from 'hono';

export interface MemberPayload {
  memberId: string;
  accountNumber: string;
}

/** Context variable name where the verified member payload is stored. */
export const MEMBER_CONTEXT = 'member';

/** Hono context Variables shape for authenticated member routes. */
export type MemberVariables = { [MEMBER_CONTEXT]: MemberPayload };

/**
 * Hono middleware that validates a Bearer JWT (member access token).
 * Sets the decoded payload in the context on success.
 * Returns 401 with a structured error if the token is missing, expired, or invalid.
 */
export const requireMember: MiddlewareHandler<{ Variables: MemberVariables }> = async (c, next) => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    return c.json({
      code: 'JWT_SECRET_NOT_CONFIGURED',
      message: 'Server JWT secret is not configured.',
    }, 500);
  }

  const authHeader = c.req.header('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({
      code: 'UNAUTHORIZED',
      message: 'Missing or invalid Authorization header. Expected: Bearer <token>',
    }, 401);
  }

  const token = authHeader.slice(7);
  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret));
    if (!payload.memberId) {
      return c.json({ code: 'UNAUTHORIZED', message: 'Invalid token payload.' }, 401);
    }
    c.set(MEMBER_CONTEXT, {
      memberId: payload.memberId as string,
      accountNumber: (payload.accountNumber as string) ?? '',
    } satisfies MemberPayload);
    await next();
  } catch {
    return c.json({ code: 'UNAUTHORIZED', message: 'Token expired or invalid.' }, 401);
  }
};

/** Reads the authenticated member id from the request context. */
export function getMemberId(c: Context<{ Variables: MemberVariables }>): string {
  return c.get(MEMBER_CONTEXT).memberId;
}
