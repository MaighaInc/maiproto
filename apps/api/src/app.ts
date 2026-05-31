import express, { type Application } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import pinoHttp from 'pino-http';
import rateLimit from 'express-rate-limit';
import swaggerUi from 'swagger-ui-express';
import { readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { prisma } from '@receiptflow/database';
import type { Redis } from 'ioredis';
import type { Services } from './config/services.js';
import type { Env } from './config/env.js';
import { logger } from './config/logger.js';

import { requestId } from './middleware/request-id.js';
import { errorHandler } from './middleware/error-handler.js';
import { resolveTenant } from './middleware/tenant.js';

import { AuthService } from './modules/auth/auth.service.js';
import { createAuthRouter } from './modules/auth/auth.routes.js';

import { ReceiptService } from './modules/receipts/receipt.service.js';
import { createReceiptRouter } from './modules/receipts/receipt.routes.js';

import { VendorService } from './modules/vendors/vendor.service.js';
import { createVendorRouter } from './modules/vendors/vendor.routes.js';

import { AccountingService } from './modules/accounting/accounting.service.js';
import { createAccountingRouter } from './modules/accounting/accounting.routes.js';

import { SearchService } from './modules/search/search.service.js';
import { createSearchRouter } from './modules/search/search.routes.js';

import { ReportsService } from './modules/reports/reports.service.js';
import { createReportsRouter } from './modules/reports/reports.routes.js';

import { BillingService } from './modules/billing/billing.service.js';
import { createBillingRouter } from './modules/billing/billing.routes.js';

import { ApprovalService } from './modules/approvals/approval.service.js';
import { createApprovalRouter } from './modules/approvals/approval.routes.js';

import { WebhookService } from './modules/webhooks/webhook.service.js';
import { createWebhookRouter } from './modules/webhooks/webhook.routes.js';

export function createApp(env: Env, services: Services, redis: Redis): Application {
  const app = express();

  // --- Security headers ---
  app.use(helmet());
  app.set('trust proxy', 1);

  // --- CORS ---
  const origins = env.CORS_ORIGINS.split(',').map((o) => o.trim());
  app.use(cors({ origin: origins, credentials: true }));

  // --- Compression ---
  app.use(compression());

  // --- HTTP request logging ---
  app.use(pinoHttp({ logger }));

  // --- Request ID ---
  app.use(requestId);

  // --- Rate limiting (global) — values from env, never hardcoded ---
  const limiter = rateLimit({
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    max: env.RATE_LIMIT_MAX_REQUESTS,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, error: { code: 'RATE_LIMITED', message: 'Too many requests' } },
  });
  app.use('/api', limiter);

  // --- Stripe webhook: must parse raw body BEFORE global JSON parser ---
  const billingRouter = createBillingRouter(
    new BillingService(prisma, {
      stripeSecretKey: env.STRIPE_SECRET_KEY ?? '',
      webhookSecret: env.STRIPE_WEBHOOK_SECRET ?? '',
      stripeApiVersion: env.STRIPE_API_VERSION,
      planPriceIds: {
        GROWTH: env.STRIPE_PRICE_GROWTH ?? '',
        PROFESSIONAL: env.STRIPE_PRICE_PROFESSIONAL ?? '',
        FIRM: env.STRIPE_PRICE_FIRM ?? '',
      },
    }),
    services.jwt,
  );
  app.use('/api/v1/billing/webhook', express.raw({ type: 'application/json' }));
  app.use('/api/v1/billing', billingRouter);

  // --- Body parsing ---
  app.use(express.json({ limit: env.BODY_SIZE_LIMIT }));
  app.use(express.urlencoded({ extended: true }));

  // --- Health check ---
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // --- API v1 Routes ---
  const authService = new AuthService(
    prisma,
    services.jwt,
    services.encryption,
    services.email,
    { email: env.EMAIL_FROM_ADDRESS, name: env.EMAIL_FROM_NAME },
  );
  app.use('/api/v1/auth', createAuthRouter(authService, services.jwt));

  // All routes below require tenant resolution
  const tenantMiddleware = resolveTenant(prisma);

  const receiptService = new ReceiptService(prisma, services.storage, redis, {
    ocrJobAttempts: env.OCR_JOB_ATTEMPTS,
    ocrJobBackoffDelayMs: env.OCR_JOB_BACKOFF_DELAY_MS,
  });
  app.use('/api/v1/receipts', tenantMiddleware, createReceiptRouter(receiptService, services.jwt));

  const vendorService = new VendorService(prisma);
  app.use('/api/v1/vendors', tenantMiddleware, createVendorRouter(vendorService, services.jwt));

  const accountingService = new AccountingService(prisma);
  app.use('/api/v1/accounting', tenantMiddleware, createAccountingRouter(accountingService, services.jwt));

  const searchService = new SearchService(prisma, services.ai);
  app.use('/api/v1/search', tenantMiddleware, createSearchRouter(searchService, services.jwt));

  const reportsService = new ReportsService(prisma);
  app.use('/api/v1/reports', tenantMiddleware, createReportsRouter(reportsService, services.jwt));

  const approvalService = new ApprovalService(prisma);
  app.use('/api/v1/approvals', tenantMiddleware, createApprovalRouter(approvalService, services.jwt));

  const webhookService = new WebhookService(prisma, redis);
  app.use('/api/v1/webhooks', tenantMiddleware, createWebhookRouter(webhookService, services.jwt));

  // --- Error handler (must be last) ---
  app.use(errorHandler);

  return app;
}
