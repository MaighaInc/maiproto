import { Worker, type Job } from 'bullmq';
import type { PrismaClient } from '@receiptflow/database';
import type { IAIProvider, ReceiptExtractionResult } from '@receiptflow/ai';
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
  redisUrl: string,
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
        where: { id: receiptId, tenantId },
      });

      if (!receipt) {
        logger.warn({ receiptId }, 'Receipt not found for categorization');
        return;
      }

      const categories = await prisma.expenseCategory.findMany({
        where: { tenantId, organizationId, isActive: true },
        select: { id: true, name: true, code: true },
      });

      if (!categories.length) {
        logger.warn({ receiptId }, 'No expense categories configured');
        return;
      }

      const categoryNames = categories.map((c) => `${c.name} (${c.code})`);
      const extractionData: ReceiptExtractionResult = {
        merchantName: receipt.merchantName ?? null,
        merchantAddress: receipt.merchantAddress ?? null,
        merchantPhone: receipt.merchantPhone ?? null,
        transactionDate: receipt.transactionDate?.toISOString() ?? null,
        transactionTime: receipt.transactionTime ?? null,
        subtotal: receipt.subtotal ? Number(receipt.subtotal) : null,
        tax: receipt.tax ? Number(receipt.tax) : null,
        tip: receipt.tip ? Number(receipt.tip) : null,
        total: receipt.total ? Number(receipt.total) : null,
        currency: receipt.currency ?? null,
        paymentMethod: receipt.paymentMethod ?? null,
        last4Digits: receipt.last4Digits ?? null,
        confidence: receipt.aiConfidence ?? 0,
      };

      const result = await ai.categorizeExpense(extractionData, categoryNames);

      // Find the matched category by name
      const matched = categories.find(
        (c) =>
          result.category === c.name ||
          result.category === c.code ||
          categoryNames.some((n) => n === result.category && n.includes(c.name)),
      );

      if (matched) {
        await prisma.receipt.update({
          where: { id: receiptId },
          data: { categoryId: matched.id, status: 'PROCESSED' },
        });
        logger.info({ receiptId, category: matched.name, confidence: result.confidence }, 'Categorized');
      } else {
        await prisma.receipt.update({
          where: { id: receiptId },
          data: { status: 'DRAFT' },
        });
        logger.warn({ receiptId, suggestedCategory: result.category }, 'Category not matched');
      }
    },
    { connection: { url: redisUrl }, concurrency: config.concurrency },
  );
}
