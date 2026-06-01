import { Worker, type Job } from 'bullmq';
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
  redisUrl: string,
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
        where: { id: receiptId, tenantId, organizationId },
        include: { category: true },
      });

      if (!receipt) {
        logger.warn({ receiptId }, 'Cannot create journal entry: receipt not found');
        return;
      }

      // Look up the org's accounting config from organization settings
      const org = await prisma.organization.findFirst({
        where: { id: organizationId, tenantId },
        select: { settings: true },
      });

      const settings = (org?.settings as Record<string, string> | null) ?? {};
      const expenseAccountCode = settings['defaultExpenseAccountCode'] ?? '5000';
      const taxAccountCode = settings['defaultTaxAccountCode'] ?? '2200';
      const payableAccountCode = settings['defaultPayableAccountCode'] ?? '2000';

      // Already journalized?
      const existing = await prisma.journalEntry.findFirst({
        where: { receiptId, tenantId },
      });
      if (existing) {
        logger.info({ receiptId }, 'Journal entry already exists, skipping');
        return;
      }

      const totalCents = receipt.total ? BigInt(Math.round(Number(receipt.total) * 100)) : 0n;
      const taxCents = receipt.tax ? BigInt(Math.round(Number(receipt.tax) * 100)) : 0n;

      const entryInput = buildReceiptJournalEntry({
        receiptId,
        organizationId,
        tenantId,
        transactionDate: receipt.transactionDate ?? receipt.createdAt,
        vendorName: receipt.merchantName ?? 'Unknown',
        total: totalCents,
        tax: taxCents,
        expenseAccountCode,
        taxAccountCode,
        payableAccountCode,
        currency: receipt.currency ?? 'USD',
        reference: receipt.id,
        description: `Receipt: ${receipt.merchantName ?? receiptId}`,
        createdByUserId: receipt.createdBy,
      });

      await prisma.$transaction(async (tx) => {
        const entryNumber = `JE-${Date.now()}-${receiptId.slice(0, 8)}`;

        const entry = await tx.journalEntry.create({
          data: {
            organizationId: entryInput.organizationId,
            tenantId: entryInput.tenantId,
            receiptId: entryInput.receiptId,
            entryNumber,
            basis: 'ACCRUAL',
            status: 'DRAFT',
            description: entryInput.description,
            entryDate: entryInput.transactionDate,
            createdBy: entryInput.createdByUserId,
            updatedBy: entryInput.createdByUserId,
          },
        });

        // Resolve account codes to account IDs
        const accountCodes = [...new Set(entryInput.lines.map((l) => l.accountCode))];
        const accounts = await tx.chartOfAccount.findMany({
          where: { organizationId, code: { in: accountCodes } },
          select: { id: true, code: true },
        });
        const accountMap = new Map(accounts.map((a) => [a.code, a.id]));

        await tx.journalLine.createMany({
          data: entryInput.lines.map((l, i) => ({
            tenantId,
            journalEntryId: entry.id,
            accountId: accountMap.get(l.accountCode) ?? entry.id, // fallback: should not occur
            description: l.description,
            ...(l.debitAmount > 0n ? { debit: Number(l.debitAmount) / 100 } : {}),
            ...(l.creditAmount > 0n ? { credit: Number(l.creditAmount) / 100 } : {}),
            currency: l.currency,
            sortOrder: i,
          })),
        });
      });

      logger.info({ receiptId }, 'Journal entry created');
    },
    { connection: { url: redisUrl }, concurrency: config.concurrency },
  );
}
