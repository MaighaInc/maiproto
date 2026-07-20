import { Router } from 'express';
import type { ApprovalService } from './approval.service.js';
import type { JwtService } from '@receiptflow/auth/jwt';
import { authenticate } from '../../middleware/auth.js';
import { asyncHandler } from '../../middleware/async-handler.js';

export function createApprovalRouter(approvalService: ApprovalService, jwtService: JwtService): Router {
  const router = Router();
  const auth = authenticate(jwtService);

  // GET /approvals/pending
  router.get('/pending', auth, asyncHandler(async (req, res) => {
    const { organizationId } = req.query as { organizationId: string };
    const data = await approvalService.getPendingApprovals(req.auth!.sub, req.tenantId!, organizationId);
    res.json({ success: true, data });
  }));

  // POST /approvals/:id/approve
  router.post('/:id/approve', auth, asyncHandler(async (req, res) => {
    const { comment } = req.body as { comment?: string };
    await approvalService.approve(req.params['id']!, req.auth!.sub, req.tenantId!, comment);
    res.json({ success: true });
  }));

  // POST /approvals/:id/reject
  router.post('/:id/reject', auth, asyncHandler(async (req, res) => {
    const { reason } = req.body as { reason: string };
    await approvalService.reject(req.params['id']!, req.auth!.sub, req.tenantId!, reason);
    res.json({ success: true });
  }));

  return router;
}
