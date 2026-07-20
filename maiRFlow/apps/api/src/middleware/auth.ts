import type { Request, Response, NextFunction, RequestHandler } from 'express';
import type { JwtService, AccessTokenPayload } from '@receiptflow/auth/jwt';
import { AuthError } from '@receiptflow/shared/errors';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      auth?: AccessTokenPayload;
      tenantId?: string;
      organizationId?: string;
    }
  }
}

export function authenticate(jwtService: JwtService): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      next(new AuthError('Missing or malformed Authorization header', 'TOKEN_MISSING'));
      return;
    }

    const token = header.slice(7);
    try {
      const payload = jwtService.verifyAccessToken(token);
      req.auth = payload;
      req.tenantId = payload.tid;
      next();
    } catch {
      next(new AuthError('Invalid or expired access token', 'TOKEN_INVALID'));
    }
  };
}

export function requirePermission(permission: string): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.auth) {
      next(new AuthError('Not authenticated', 'TOKEN_MISSING'));
      return;
    }
    if (!req.auth.permissions.includes(permission)) {
      next(new AuthError('Insufficient permissions', 'INSUFFICIENT_PERMISSIONS'));
      return;
    }
    next();
  };
}

export function requireRole(role: string): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.auth) {
      next(new AuthError('Not authenticated', 'TOKEN_MISSING'));
      return;
    }
    if (!req.auth.roles.includes(role)) {
      next(new AuthError('Insufficient role', 'INSUFFICIENT_PERMISSIONS'));
      return;
    }
    next();
  };
}
