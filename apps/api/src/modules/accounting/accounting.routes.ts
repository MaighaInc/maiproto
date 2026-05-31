import { Router } from 'express';
import type { AccountingService } from './accounting.service.js';
import type { JwtService } from '@receiptflow/auth/jwt';
import { authenticate } from '../../middleware/auth.js';
import { asyncHandler } from '../../middleware/async-handler.js';
import { z } from 'zod';
import { validate } from '../../middleware/validate.js';

const dateRangeQuery = z.object({
  organizationId: z.string(),
  page: z.coerce.number().default(1),
  pageSize: z.coerce.number().default(20),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  status: z.string().optional(),
});

export function createAccountingRouter(accountingService: AccountingService, jwtService: JwtService): Router {
  const router = Router();
  const auth = authenticate(jwtService);

  // GET /accounting/chart-of-accounts
  router.get('/chart-of-accounts', auth, asyncHandler(async (req, res) => {
    const { organizationId } = req.query as { organizationId: string };
    const data = await accountingService.getChartOfAccounts(req.tenantId!, organizationId);
    res.json({ success: true, data });
  }));

  // GET /accounting/journal-entries
  router.get('/journal-entries', auth, validate(dateRangeQuery, 'query'), asyncHandler(async (req, res) => {
    const { organizationId, page, pageSize, dateFrom, dateTo, status } = req.query as z.infer<typeof dateRangeQuery>;
    const result = await accountingService.getJournalEntries(req.tenantId!, organizationId, { page, pageSize, dateFrom, dateTo, status });
    res.json({ success: true, ...result });
  }));

  // POST /accounting/journal-entries/:id/post
  router.post('/journal-entries/:id/post', auth, asyncHandler(async (req, res) => {
    const { organizationId } = req.body as { organizationId: string };
    const data = await accountingService.postJournalEntry({
      journalEntryId: req.params['id']!,
      tenantId: req.tenantId!,
      organizationId,
      postedById: req.auth!.sub,
    });
    res.json({ success: true, data });
  }));

  // GET /accounting/bank-accounts
  router.get('/bank-accounts', auth, asyncHandler(async (req, res) => {
    const { organizationId } = req.query as { organizationId: string };
    const data = await accountingService.getBankAccounts(req.tenantId!, organizationId);
    res.json({ success: true, data });
  }));

  // GET /accounting/bank-accounts/:id/transactions
  router.get('/bank-accounts/:id/transactions', auth, asyncHandler(async (req, res) => {
    const { organizationId, page = '1', pageSize = '20' } = req.query as Record<string, string>;
    const result = await accountingService.getBankTransactions(
      req.tenantId!,
      organizationId,
      req.params['id']!,
      { page: Number(page), pageSize: Number(pageSize) },
    );
    res.json({ success: true, ...result });
  }));

  return router;
}
