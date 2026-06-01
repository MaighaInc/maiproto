import { Worker, type Job } from 'bullmq';
import type { PrismaClient } from '@receiptflow/database';
import { QUEUE_NAMES } from '@receiptflow/shared/constants';
import type { Logger } from 'pino';

export interface WebhookWorkerConfig {
  maxAttempts: number;
  backoffBaseMs: number;
  requestTimeoutMs: number;
  maxResponseBodyBytes: number;
  concurrency: number;
}

export interface WebhookDeliveryJobData {
  webhookId: string;
  event: string;
  url: string;
  body: string;
  signature: string;
  attempt?: number;
}

export function createWebhookWorker(
  redisUrl: string,
  prisma: PrismaClient,
  logger: Logger,
  config: WebhookWorkerConfig,
): Worker {
  return new Worker<WebhookDeliveryJobData>(
    QUEUE_NAMES.WEBHOOK_DELIVERY,
    async (job: Job<WebhookDeliveryJobData>) => {
      const { webhookId, event, url, body, signature, attempt = 1 } = job.data;

      const deliveryStart = Date.now();
      let statusCode = 0;
      let responseBody = '';
      let success = false;

      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-ReceiptFlow-Signature': `sha256=${signature}`,
            'X-ReceiptFlow-Attempt': String(attempt),
          },
          body,
          signal: AbortSignal.timeout(config.requestTimeoutMs),
        });

        statusCode = response.status;
        responseBody = await response.text();
        success = statusCode >= 200 && statusCode < 300;
      } catch (err) {
        responseBody = (err as Error).message;
      }

      const durationMs = Date.now() - deliveryStart;
      void durationMs; // recorded for observability; not in current schema

      await prisma.webhookDelivery.create({
        data: {
          webhookId,
          event,
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          payload: JSON.parse(body),
          statusCode: statusCode || null,
          response: responseBody.slice(0, config.maxResponseBodyBytes) || null,
          attempts: attempt,
          succeededAt: success ? new Date() : null,
        },
      });

      if (!success && attempt < config.maxAttempts) {
        await job.updateData({ ...job.data, attempt: attempt + 1 });
        throw new Error(`Delivery failed with status ${statusCode} — will retry (attempt ${attempt})`);
      }

      if (!success) {
        await prisma.webhook.update({
          where: { id: webhookId },
          data: { retryCount: { increment: 1 } },
        });
        logger.error({ webhookId, url, attempts: attempt }, 'Webhook delivery permanently failed');
      } else {
        await prisma.webhook.update({
          where: { id: webhookId },
          data: { retryCount: 0 },
        });
        logger.debug({ webhookId, statusCode }, 'Webhook delivered');
      }
    },
    {
      connection: { url: redisUrl },
      concurrency: config.concurrency,
    },
  );
}

