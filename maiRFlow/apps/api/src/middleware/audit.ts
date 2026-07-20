import type { Request, Response, NextFunction } from 'express';
import type { PrismaClient, Prisma } from '@receiptflow/database';
import type { AuditAction } from '@receiptflow/database';
import { logger } from '../config/logger.js';

export interface AuditContext {
  action: AuditAction;
  resource: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
}

export function auditLog(prisma: PrismaClient, context: AuditContext) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    // Queue the audit log after the route handler completes
    const originalJson = _res.json.bind(_res);
    _res.json = function (body: unknown) {
      const result = originalJson(body);
      if (_res.statusCode < 400 && req.auth) {
        prisma.auditLog
          .create({
            data: {
              tenantId: req.tenantId ?? req.auth.tid,
              userId: req.auth.sub,
              action: context.action,
              resource: context.resource,
              resourceId: context.resourceId ?? extractResourceId(req) ?? null,
              ipAddress: req.ip ?? req.socket.remoteAddress ?? 'unknown',
              userAgent: req.headers['user-agent'] ?? 'unknown',
              requestId: String(req.id),
              metadata: (context.metadata ?? {}) as Prisma.InputJsonObject,
            },
          })
          .catch((err: unknown) => {
            logger.error({ err }, 'Failed to write audit log');
          });
      }
      return result;
    };
    next();
  };
}

function extractResourceId(req: Request): string | undefined {
  return (req.params['id'] ?? req.params['receiptId'] ?? req.params['vendorId']) as
    | string
    | undefined;
}
