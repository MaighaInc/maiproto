import { Router } from 'express';
import type { ReportsService } from './reports.service.js';
import type { JwtService } from '@receiptflow/auth/jwt';
import { authenticate } from '../../middleware/auth.js';
import { asyncHandler } from '../../middleware/async-handler.js';
import { z } from 'zod';
import { validate } from '../../middleware/validate.js';

const reportQuery = z.object({
  organizationId: z.string(),
  dateFrom: z.string(),
  dateTo: z.string(),
  page: z.coerce.number().default(1),
  pageSize: z.coerce.number().default(100),
});

export function createReportsRouter(reportsService: ReportsService, jwtService: JwtService): Router {
  const router = Router();
  const auth = authenticate(jwtService);

  router.get('/expense-summary', auth, validate(reportQuery, 'query'), asyncHandler(async (req, res) => {
    const { organizationId, dateFrom, dateTo } = req.query as z.infer<typeof reportQuery>;
    const data = await reportsService.expenseSummary(
      req.tenantId!, organizationId, new Date(dateFrom), new Date(dateTo),
    );
    res.json({ success: true, data });
  }));

  router.get('/tax', auth, validate(reportQuery, 'query'), asyncHandler(async (req, res) => {
    const { organizationId, dateFrom, dateTo } = req.query as z.infer<typeof reportQuery>;
    const data = await reportsService.taxReport(
      req.tenantId!, organizationId, new Date(dateFrom), new Date(dateTo),
    );
    res.json({ success: true, data });
  }));

  router.get('/audit', auth, validate(reportQuery, 'query'), asyncHandler(async (req, res) => {
    const { dateFrom, dateTo, page, pageSize } = req.query as z.infer<typeof reportQuery>;
    const result = await reportsService.auditReport(
      req.tenantId!, new Date(dateFrom), new Date(dateTo), page, pageSize,
    );
    res.json({ success: true, ...result });
  }));

  return router;
}
