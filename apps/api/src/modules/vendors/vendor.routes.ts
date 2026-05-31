import { Router } from 'express';
import type { VendorService } from './vendor.service.js';
import type { JwtService } from '@receiptflow/auth/jwt';
import { authenticate } from '../../middleware/auth.js';
import { asyncHandler } from '../../middleware/async-handler.js';
import { validate } from '../../middleware/validate.js';
import { createVendorSchema, paginationSchema } from '@receiptflow/shared/validators';
import { z } from 'zod';

const vendorQuerySchema = paginationSchema.extend({ search: z.string().optional(), organizationId: z.string() });

export function createVendorRouter(vendorService: VendorService, jwtService: JwtService): Router {
  const router = Router();
  const auth = authenticate(jwtService);

  router.get('/', auth, validate(vendorQuerySchema, 'query'), asyncHandler(async (req, res) => {
    const { page = 1, pageSize = 20, search, organizationId } = req.query as {
      page?: number; pageSize?: number; search?: string; organizationId: string;
    };
    const result = await vendorService.getVendors(req.tenantId!, organizationId, { page: Number(page), pageSize: Number(pageSize), search });
    res.json({ success: true, ...result });
  }));

  router.post('/', auth, validate(createVendorSchema), asyncHandler(async (req, res) => {
    const data = await vendorService.createVendor({
      ...(req.body as Omit<Parameters<VendorService['createVendor']>[0], 'tenantId'>),
      tenantId: req.tenantId!,
    });
    res.status(201).json({ success: true, data });
  }));

  router.get('/:id', auth, asyncHandler(async (req, res) => {
    const { organizationId } = req.query as { organizationId: string };
    const data = await vendorService.getVendorById(req.params['id']!, req.tenantId!, organizationId);
    res.json({ success: true, data });
  }));

  router.delete('/:id', auth, asyncHandler(async (req, res) => {
    const { organizationId } = req.query as { organizationId: string };
    await vendorService.deleteVendor(req.params['id']!, req.tenantId!, organizationId);
    res.json({ success: true });
  }));

  return router;
}
