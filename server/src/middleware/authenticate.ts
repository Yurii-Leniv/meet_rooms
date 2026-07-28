import type { NextFunction, Request, Response } from 'express';
import { verifyToken } from '../lib/auth.js';
import { forbidden, unauthorized } from '../lib/http.js';

declare global {
  namespace Express {
    interface Request {
      user?: { userId: string; role: string; companyId: string };
    }
  }
}

export function authenticate(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return next(unauthorized('Missing or malformed Authorization header'));
  }
  const token = header.slice('Bearer '.length);
  try {
    const payload = verifyToken(token);
    req.user = {
      userId: payload.userId,
      role: payload.role,
      companyId: payload.companyId,
    };
    next();
  } catch {
    next(unauthorized('Invalid or expired token'));
  }
}

export function requireAdmin(req: Request, _res: Response, next: NextFunction) {
  if (req.user?.role !== 'ADMIN') {
    return next(forbidden('Admin access required'));
  }
  next();
}
