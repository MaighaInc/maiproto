import type { Request, Response, NextFunction } from 'express';
import type { PrismaClient } from '@receiptflow/database';
import { NotFoundError } from '@receiptflow/shared/errors';

export function resolveTenant(prisma: PrismaClient) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    const tenantId = req.auth?.tid ?? req.headers['x-tenant-id'] as string | undefined;
    if (!tenantId) {
      next(new NotFoundError('Tenant not found'));
      return;
    }

    const tenant = await prisma.tenant.findFirst({
      where: { id: tenantId, status: 'ACTIVE', deletedAt: null },
      select: { id: true, status: true },
    });

    if (!tenant) {
      next(new NotFoundError('Tenant not found or inactive'));
      return;
    }

    req.tenantId = tenant.id;
    next();
  };
}
