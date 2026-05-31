import { Router } from 'express';
import type { BillingService } from './billing.service.js';
import type { JwtService } from '@receiptflow/auth/jwt';
import { authenticate } from '../../middleware/auth.js';
import { asyncHandler } from '../../middleware/async-handler.js';

export function createBillingRouter(billingService: BillingService, jwtService: JwtService): Router {
  const router = Router();
  const auth = authenticate(jwtService);

  // POST /billing/checkout
  router.post('/checkout', auth, asyncHandler(async (req, res) => {
    const { plan, successUrl, cancelUrl } = req.body as {
      plan: string; successUrl: string; cancelUrl: string;
    };
    const result = await billingService.createCheckoutSession(req.tenantId!, plan, successUrl, cancelUrl);
    res.json({ success: true, data: result });
  }));

  // POST /billing/portal
  router.post('/portal', auth, asyncHandler(async (req, res) => {
    const { returnUrl } = req.body as { returnUrl: string };
    const result = await billingService.createPortalSession(req.tenantId!, returnUrl);
    res.json({ success: true, data: result });
  }));

  // POST /billing/webhook — raw body required, no auth
  router.post('/webhook', asyncHandler(async (req, res) => {
    const signature = req.headers['stripe-signature'] as string;
    await billingService.handleWebhook(req.body as Buffer, signature);
    res.json({ received: true });
  }));

  return router;
}
