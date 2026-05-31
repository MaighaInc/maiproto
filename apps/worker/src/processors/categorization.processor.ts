import { Worker, type Job } from 'bullmq';
import type { Redis } from 'ioredis';
import type { PrismaClient } from '@receiptflow/database';
import type { IAIProvider } from '@receiptflow/ai';
import { QUEUE_NAMES } from '@receiptflow/shared/constants';
import type { Logger } from 'pino';

export interface CategorizationJobData {
  receiptId: string;
  tenantId: string;
  organizationId: string;
}

export interface CategorizationWorkerConfig {
  concurrency: number;
}

export function createCategorizationWorker(
  redis: Redis,
  prisma: PrismaClient,
  ai: IAIProvider,
  logger: Logger,
  config: CategorizationWorkerConfig,
): Worker {
  return new Worker<CategorizationJobData>(
    QUEUE_NAMES.CATEGORIZATION,
    async (job: Job<CategorizationJobData>) => {
      const { receiptId, tenantId, organizationId } = job.data;
      logger.info({ receiptId }, 'Processing categorization job');

      const receipt = await prisma.receipt.findFirst({
        where: { id: receiptId, tenantId, deletedAt: null },
        include: { metadata: true },
      });

      if (!receipt?.metadata) {
        logger.warn({ receiptId }, 'Receipt metadata not found for categorization');
        return;
      }

      const categories = await prisma.expenseCategory.findMany({
        where: { tenantId, organizationId, isActive: true, deletedAt: null },
        select: { id: true, name: true, code: true },
      });

      if (!categories.length) {
        logger.warn({ receiptId }, 'No expense categories configured');
        return;
      }

      const categoryNames = categories.map((c) => `${c.name} (${c.code})`);
      const extractionData = {
        merchantName: receipt.metadata.merchantName ?? undefined,
        total: receipt.metadata.total ? Number(receipt.metadata.total) / 100 : undefined,
        currency: receipt.metadata.currency ?? 'USD',
      };

      const result = await ai.categorizeExpense(extractionData as never, categoryNames);

      // Find the matched category by name
      const matched = categories.find(
        (c) =>
          result.category === c.name ||
          result.category === c.code ||
          categoryNames.some(
            (n) => n === result.category && n.includes(c.name),
          ),
      );

      if (matched) {
        await prisma.receipt.update({
          where: { id: receiptId },
          data: { categoryId: matched.id, status: 'CATEGORIZED' },
        });
        logger.info({ receiptId, category: matched.name, confidence: result.confidence }, 'Categorized');
      } else {
        await prisma.receipt.update({
          where: { id: receiptId },
          data: { status: 'REVIEW_REQUIRED' },
        });
        logger.warn({ receiptId, suggestedCategory: result.category }, 'Category not matched');
      }
    },
    { connection: redis, concurrency: config.concurrency },
  );
}
