import { Router } from 'express';
import type { SearchService } from './search.service.js';
import type { JwtService } from '@receiptflow/auth/jwt';
import { authenticate } from '../../middleware/auth.js';
import { asyncHandler } from '../../middleware/async-handler.js';
import { validate } from '../../middleware/validate.js';
import { searchSchema, aiSearchSchema } from '@receiptflow/shared/validators';

export function createSearchRouter(searchService: SearchService, jwtService: JwtService): Router {
  const router = Router();
  const auth = authenticate(jwtService);

  // GET /search?query=...&organizationId=...
  router.get('/', auth, validate(searchSchema, 'query'), asyncHandler(async (req, res) => {
    const { query, organizationId, page = 1, pageSize = 20 } = req.query as unknown as {
      query: string; organizationId: string; page?: number; pageSize?: number;
    };
    const result = await searchService.search(
      req.tenantId!,
      organizationId,
      query,
      Number(page),
      Number(pageSize),
    );
    res.json({ success: true, ...result });
  }));

  // POST /search/ai — AI-powered natural language search
  router.post('/ai', auth, validate(aiSearchSchema), asyncHandler(async (req, res) => {
    const { query, organizationId, page = 1, pageSize = 20 } = req.body as {
      query: string; organizationId: string; page?: number; pageSize?: number;
    };
    const result = await searchService.aiSearch(
      req.tenantId!,
      organizationId,
      query,
      Number(page),
      Number(pageSize),
    );
    res.json({ success: true, ...result });
  }));

  return router;
}
