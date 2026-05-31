import { Worker, type Job } from 'bullmq';
import type { Redis } from 'ioredis';
import type { PrismaClient } from '@receiptflow/database';
import type { IOCRProvider } from '@receiptflow/ocr';
import type { IStorageProvider } from '@receiptflow/storage';
import type { IAIProvider, ExtractReceiptDataResult } from '@receiptflow/ai';
import { QUEUE_NAMES } from '@receiptflow/shared/constants';
import type { Logger } from 'pino';

export interface OCRWorkerConfig {
  concurrency: number;
}

export interface OCRJobData {
  receiptId: string;
  tenantId: string;
  organizationId: string;
  storageKey: string;
  mimeType: string;
}

/** Convert a decimal dollar amount to BigInt cents, or null if undefined. */
function toCents(amount: number | null | undefined): bigint | null {
  return amount != null ? BigInt(Math.round(amount * 100)) : null;
}

// ─── Sub-functions ────────────────────────────────────────────────────────────

async function runOCR(
  storage: IStorageProvider,
  ocr: IOCRProvider,
  storageKey: string,
  mimeType: string,
) {
  const fileBuffer = await storage.download(storageKey);
  return ocr.processDocument(fileBuffer, mimeType, { detectTables: true, detectForms: true });
}

async function persistOCRRecord(
  prisma: PrismaClient,
  receiptId: string,
  tenantId: string,
  ocr: IOCRProvider,
  ocrResult: Awaited<ReturnType<IOCRProvider['processDocument']>>,
) {
  return prisma.receiptOCR.create({
    data: {
      receiptId,
      tenantId,
      provider: ocr.providerName as never,
      fullText: ocrResult.fullText,
      confidence: ocrResult.confidence,
      pageCount: ocrResult.pages.length,
      rawData: ocrResult.providerMetadata as never,
      processingTimeMs: ocrResult.durationMs,
    },
  });
}

async function persistExtractedMetadata(
  prisma: PrismaClient,
  receiptId: string,
  tenantId: string,
  ocrId: string,
  ai: IAIProvider,
  extraction: ExtractReceiptDataResult,
) {
  return prisma.receiptMetadata.create({
    data: {
      receiptId,
      tenantId,
      ocrId,
      merchantName: extraction.merchantName ?? null,
      merchantAddress: extraction.merchantAddress ?? null,
      merchantPhone: extraction.merchantPhone ?? null,
      transactionDate: extraction.transactionDate ? new Date(extraction.transactionDate) : null,
      subtotal: toCents(extraction.subtotal),
      tax: toCents(extraction.tax),
      tip: toCents(extraction.tip),
      total: toCents(extraction.total),
      currency: extraction.currency ?? 'USD',
      paymentMethod: extraction.paymentMethod ?? null,
      last4Digits: extraction.last4Digits ?? null,
      aiConfidence: extraction.confidence,
      aiProvider: ai.providerName as never,
    },
  });
}

async function persistLineItems(
  prisma: PrismaClient,
  receiptId: string,
  tenantId: string,
  lineItems: NonNullable<ExtractReceiptDataResult['lineItems']>,
) {
  if (!lineItems.length) return;
  await prisma.receiptLineItem.createMany({
    data: lineItems.map((item) => ({
      receiptId,
      tenantId,
      description: item.description,
      quantity: item.quantity ?? 1,
      unitPrice: toCents(item.unitPrice),
      totalPrice: toCents(item.totalPrice),
      category: item.category ?? null,
    })),
  });
}

async function finaliseReceipt(
  prisma: PrismaClient,
  receiptId: string,
  extraction: ExtractReceiptDataResult,
) {
  await prisma.receipt.update({
    where: { id: receiptId },
    data: {
      status: 'EXTRACTED',
      transactionDate: extraction.transactionDate ? new Date(extraction.transactionDate) : undefined,
      total: toCents(extraction.total) ?? undefined,
    },
  });
}

// ─── Worker factory ───────────────────────────────────────────────────────────

export function createOCRWorker(
  redis: Redis,
  prisma: PrismaClient,
  ocr: IOCRProvider,
  storage: IStorageProvider,
  ai: IAIProvider,
  logger: Logger,
  config: OCRWorkerConfig,
): Worker {
  return new Worker<OCRJobData>(
    QUEUE_NAMES.OCR,
    async (job: Job<OCRJobData>) => {
      const { receiptId, tenantId, storageKey, mimeType } = job.data;
      logger.info({ receiptId, jobId: job.id }, 'Processing OCR job');

      await prisma.receipt.update({ where: { id: receiptId }, data: { status: 'PROCESSING' } });

      const ocrResult = await runOCR(storage, ocr, storageKey, mimeType);
      const ocrRecord = await persistOCRRecord(prisma, receiptId, tenantId, ocr, ocrResult);

      const extraction = await ai.extractReceiptData({ ocrText: ocrResult.fullText });

      await persistExtractedMetadata(prisma, receiptId, tenantId, ocrRecord.id, ai, extraction);
      await persistLineItems(prisma, receiptId, tenantId, extraction.lineItems ?? []);
      await finaliseReceipt(prisma, receiptId, extraction);

      logger.info({ receiptId }, 'OCR and AI extraction complete');
    },
    {
      connection: redis,
      concurrency: config.concurrency,
    },
  );
}

