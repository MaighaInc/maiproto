import { Router } from 'express';
import type { WebhookService } from './webhook.service.js';
import type { JwtService } from '@receiptflow/auth/jwt';
import { authenticate } from '../../middleware/auth.js';
import { asyncHandler } from '../../middleware/async-handler.js';
import { validate } from '../../middleware/validate.js';
import { createWebhookSchema } from '@receiptflow/shared/validators';

export function createWebhookRouter(webhookService: WebhookService, jwtService: JwtService): Router {
  const router = Router();
  const auth = authenticate(jwtService);

  router.get('/', auth, asyncHandler(async (req, res) => {
    const { organizationId } = req.query as { organizationId: string };
    const data = await webhookService.listWebhooks(req.tenantId!, organizationId);
    res.json({ success: true, data });
  }));

  router.post('/', auth, validate(createWebhookSchema), asyncHandler(async (req, res) => {
    const data = await webhookService.createWebhook({
      ...(req.body as Omit<Parameters<WebhookService['createWebhook']>[0], 'tenantId'>),
      tenantId: req.tenantId!,
    });
    res.status(201).json({ success: true, data });
  }));

  router.delete('/:id', auth, asyncHandler(async (req, res) => {
    await webhookService.deleteWebhook(req.params['id']!, req.tenantId!);
    res.json({ success: true });
  }));

  return router;
}
