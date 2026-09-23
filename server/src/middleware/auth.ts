import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../env';
import { unauthorized } from '../lib/errors';

export const AUTH_COOKIE = 'crm_token';

export interface AuthRequest extends Request {
  userId: string;
}

interface TokenPayload {
  sub: string;
}

export function signToken(userId: string): string {
  return jwt.sign({ sub: userId }, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN,
  } as jwt.SignOptions);
}

export function setAuthCookie(res: Response, token: string): void {
  res.cookie(AUTH_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: env.isProduction,
    path: '/',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

export function clearAuthCookie(res: Response): void {
  res.clearCookie(AUTH_COOKIE, { path: '/' });
}

function extractToken(req: Request): string | null {
  const fromCookie = (req.cookies as Record<string, string> | undefined)?.[AUTH_COOKIE];
  if (fromCookie) return fromCookie;
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) return header.slice(7);
  return null;
}

/** Exige sesión válida y expone req.userId a los handlers. */
export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const token = extractToken(req);
  if (!token) {
    next(unauthorized('Inicia sesión para continuar'));
    return;
  }
  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as TokenPayload;
    (req as AuthRequest).userId = payload.sub;
    next();
  } catch {
    next(unauthorized('Sesión caducada o no válida'));
  }
}
