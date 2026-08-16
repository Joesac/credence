import jwt from 'jsonwebtoken';
import type { Request, Response, NextFunction } from 'express';

export interface MemberPayload {
  memberId: string;
  accountNumber: string;
}

declare module 'express-serve-static-core' {
  interface Request {
    member?: MemberPayload;
  }
}

/**
 * Express middleware that validates a Bearer JWT (member access token).
 * Sets req.member with the decoded payload on success.
 * Returns 401 with a structured error if the token is missing, expired, or invalid.
 */
export function requireMember(req: Request, res: Response, next: NextFunction): void {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    res.status(500).json({
      code: 'JWT_SECRET_NOT_CONFIGURED',
      message: 'Server JWT secret is not configured.',
    });
    return;
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      code: 'UNAUTHORIZED',
      message: 'Missing or invalid Authorization header. Expected: Bearer <token>',
    });
    return;
  }

  const token = authHeader.slice(7);
  try {
    const decoded = jwt.verify(token, secret) as MemberPayload;
    if (!decoded.memberId) {
      res.status(401).json({ code: 'UNAUTHORIZED', message: 'Invalid token payload.' });
      return;
    }
    req.member = decoded;
    next();
  } catch {
    res.status(401).json({ code: 'UNAUTHORIZED', message: 'Token expired or invalid.' });
  }
}
