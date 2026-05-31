import { prisma } from '@receiptflow/database';
import { createAIProvider } from '@receiptflow/ai';
import { createOCRProvider } from '@receiptflow/ocr';
import { createStorageProvider } from '@receiptflow/storage';
import { createEmailProvider } from '@receiptflow/notifications';
import { getRedis, closeRedis } from './config/redis.js';
import { logger } from './config/logger.js';
import { getConfig } from './config/env.js';

import { createOCRWorker } from './processors/ocr.processor.js';
import { createCategorizationWorker } from './processors/categorization.processor.js';
import { createNotificationWorker } from './processors/notification.processor.js';
import { createJournalWorker } from './processors/journal.processor.js';
import { createWebhookWorker } from './processors/webhook.processor.js';

async function main(): Promise<void> {
  const env = getConfig();
  const redis = getRedis();

  const ai = createAIProvider({
    provider: env.AI_PROVIDER,
    ...(env.AI_PROVIDER === 'openai' ? { openai: { apiKey: env.AI_API_KEY } } : {}),
    ...(env.AI_PROVIDER === 'claude' ? { claude: { apiKey: env.AI_API_KEY } } : {}),
    ...(env.AI_PROVIDER === 'gemini' ? { gemini: { apiKey: env.AI_API_KEY } } : {}),
  });

  const ocr = createOCRProvider({
    provider: env.OCR_PROVIDER,
    ...(env.OCR_PROVIDER === 'textract'
      ? { textract: { region: env.AWS_REGION!, accessKeyId: env.AWS_ACCESS_KEY_ID!, secretAccessKey: env.AWS_SECRET_ACCESS_KEY! } }
      : env.OCR_PROVIDER === 'documentai'
      ? { documentAI: { projectId: env.GCP_PROJECT_ID!, processorId: env.DOCUMENTAI_PROCESSOR_ID!, location: env.DOCUMENTAI_LOCATION ?? 'us' } }
      : { formRecognizer: { endpoint: env.AZURE_FORM_RECOGNIZER_ENDPOINT!, apiKey: env.AZURE_FORM_RECOGNIZER_KEY! } }),
  });

  const storage = createStorageProvider({
    provider: env.STORAGE_PROVIDER,
    ...(env.STORAGE_PROVIDER === 's3'
      ? { s3: { region: env.AWS_REGION!, bucket: env.AWS_S3_BUCKET!, accessKeyId: env.AWS_ACCESS_KEY_ID!, secretAccessKey: env.AWS_SECRET_ACCESS_KEY! } }
      : env.STORAGE_PROVIDER === 'r2'
      ? { r2: { accountId: env.R2_ACCOUNT_ID!, bucket: env.R2_BUCKET!, accessKeyId: env.R2_ACCESS_KEY_ID!, secretAccessKey: env.R2_SECRET_ACCESS_KEY! } }
      : { local: { basePath: env.LOCAL_STORAGE_DIR ?? './uploads', baseUrl: 'http://localhost:3001/uploads' } }),
  });

  const emailProvider = createEmailProvider({
    provider: env.EMAIL_PROVIDER,
    ...(env.EMAIL_PROVIDER === 'smtp' && env.SMTP_HOST && env.SMTP_PORT && env.SMTP_USER && env.SMTP_PASS
      ? { smtp: { host: env.SMTP_HOST, port: env.SMTP_PORT, user: env.SMTP_USER, password: env.SMTP_PASS, secure: env.SMTP_SECURE ?? false } }
      : {}),
    ...(env.EMAIL_PROVIDER === 'sendgrid' && env.SENDGRID_API_KEY ? { sendgrid: { apiKey: env.SENDGRID_API_KEY } } : {}),
    ...(env.EMAIL_PROVIDER === 'resend' && env.RESEND_API_KEY ? { resend: { apiKey: env.RESEND_API_KEY } } : {}),
  });

  const emailFrom = { email: env.EMAIL_FROM_ADDRESS, name: env.EMAIL_FROM_NAME };

  const workers = [
    createOCRWorker(redis, prisma, ocr, storage, ai, logger, {
      concurrency: env.OCR_CONCURRENCY,
    }),
    createCategorizationWorker(redis, prisma, ai, logger, {
      concurrency: env.CATEGORIZATION_CONCURRENCY,
    }),
    createNotificationWorker(redis, prisma, emailProvider, emailFrom, logger, {
      concurrency: env.NOTIFICATION_CONCURRENCY,
    }),
    createJournalWorker(redis, prisma, logger, {
      concurrency: env.JOURNAL_CONCURRENCY,
    }),
    createWebhookWorker(redis, prisma, logger, {
      maxAttempts: env.WEBHOOK_MAX_ATTEMPTS,
      backoffBaseMs: env.WEBHOOK_BACKOFF_BASE_MS,
      requestTimeoutMs: env.WEBHOOK_REQUEST_TIMEOUT_MS,
      maxResponseBodyBytes: env.WEBHOOK_MAX_RESPONSE_BODY_BYTES,
      concurrency: env.WEBHOOK_CONCURRENCY,
    }),
  ];

  logger.info({ workerCount: workers.length }, 'BullMQ workers started');

  const shutdown = async (signal: string): Promise<void> => {
    logger.info({ signal }, 'Shutting down workers...');
    await Promise.all(workers.map((w) => w.close()));
    await prisma.$disconnect();
    await closeRedis();
    logger.info('Worker shutdown complete');
    process.exit(0);
  };

  process.on('SIGTERM', () => { void shutdown('SIGTERM'); });
  process.on('SIGINT', () => { void shutdown('SIGINT'); });

  process.on('unhandledRejection', (reason) => {
    logger.error({ reason }, 'Unhandled rejection in worker');
  });
}

main().catch((err) => {
  console.error('Failed to start workers:', err);
  process.exit(1);
});
