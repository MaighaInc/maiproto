import { Worker, type Job } from 'bullmq';
import type { Redis } from 'ioredis';
import type { PrismaClient } from '@receiptflow/database';
import { QUEUE_NAMES } from '@receiptflow/shared/constants';
import { buildReceiptJournalEntry } from '@receiptflow/accounting';
import type { Logger } from 'pino';

export interface JournalJobData {
  receiptId: string;
  tenantId: string;
  organizationId: string;
}

export interface JournalWorkerConfig {
  concurrency: number;
}

export function createJournalWorker(
  redis: Redis,
  prisma: PrismaClient,
  logger: Logger,
  config: JournalWorkerConfig,
): Worker {
  return new Worker<JournalJobData>(
    QUEUE_NAMES.JOURNAL,
    async (job: Job<JournalJobData>) => {
      const { receiptId, tenantId, organizationId } = job.data;
      logger.info({ receiptId }, 'Processing journal entry job');

      const receipt = await prisma.receipt.findFirst({
        where: { id: receiptId, tenantId, organizationId, deletedAt: null },
        include: {
          metadata: true,
          category: true,
          vendor: true,
          uploadedBy: { select: { id: true } },
        },
      });

      if (!receipt?.metadata) {
        logger.warn({ receiptId }, 'Cannot create journal entry: metadata missing');
        return;
      }

      // Look up the org's default accounting config
      const orgConfig = await prisma.accountingConfig.findFirst({
        where: { tenantId, organizationId },
      });

      if (!orgConfig) {
        logger.warn({ receiptId }, 'No accounting config — skipping journal entry');
        return;
      }

      // Already journalized?
      const existing = await prisma.journalEntry.findFirst({
        where: { receiptId, tenantId, deletedAt: null },
      });
      if (existing) {
        logger.info({ receiptId }, 'Journal entry already exists, skipping');
        return;
      }

      const entryInput = buildReceiptJournalEntry({
        receiptId,
        organizationId,
        tenantId,
        transactionDate: receipt.metadata.transactionDate ?? receipt.createdAt,
        vendorName: receipt.vendor?.name ?? receipt.metadata.merchantName ?? 'Unknown',
        total: receipt.metadata.total ?? 0n,
        tax: receipt.metadata.tax ?? 0n,
        expenseAccountCode: orgConfig.defaultExpenseAccountCode,
        taxAccountCode: orgConfig.defaultTaxAccountCode,
        payableAccountCode: orgConfig.defaultPayableAccountCode,
        currency: receipt.metadata.currency ?? 'USD',
        reference: receipt.id,
        description: `Receipt: ${receipt.vendor?.name ?? receipt.metadata.merchantName ?? receiptId}`,
        createdByUserId: receipt.uploadedById,
      });

      await prisma.$transaction(async (tx) => {
        const entry = await tx.journalEntry.create({
          data: {
            ...entryInput,
            lines: undefined,
          },
        });

        await tx.journalLine.createMany({
          data: entryInput.lines.map((l) => ({
            ...l,
            journalEntryId: entry.id,
            tenantId,
            organizationId,
          })),
        });
      });

      logger.info({ receiptId }, 'Journal entry created');
    },
    { connection: redis, concurrency: config.concurrency },
  );
}
