import { Worker, type Job } from 'bullmq';
import type { PrismaClient } from '@receiptflow/database';
import type { IOCRProvider } from '@receiptflow/ocr';
import type { IStorageProvider } from '@receiptflow/storage';
import type { IAIProvider, ReceiptExtractionResult } from '@receiptflow/ai';
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
      rawText: ocrResult.fullText,
      confidence: ocrResult.confidence,
      blocks: ocrResult.pages as never,
      providerMetadata: ocrResult.providerMetadata as never,
      durationMs: ocrResult.durationMs,
    },
  });
}

async function persistLineItems(
  prisma: PrismaClient,
  receiptId: string,
  tenantId: string,
  lineItems: NonNullable<ReceiptExtractionResult['lineItems']>,
) {
  if (!lineItems.length) return;
  await prisma.receiptLineItem.createMany({
    data: lineItems.map((item) => ({
      receiptId,
      tenantId,
      description: item.description,
      quantity: item.quantity ?? null,
      unitPrice: item.unitPrice ?? null,
      amount: item.amount,
      taxable: item.taxable ?? false,
    })),
  });
}

async function finaliseReceipt(
  prisma: PrismaClient,
  receiptId: string,
  ai: IAIProvider,
  extraction: ReceiptExtractionResult,
) {
  await prisma.receipt.update({
    where: { id: receiptId },
    data: {
      status: 'PROCESSED',
      merchantName: extraction.merchantName,
      merchantAddress: extraction.merchantAddress,
      merchantPhone: extraction.merchantPhone,
      transactionDate: extraction.transactionDate ? new Date(extraction.transactionDate) : null,
      transactionTime: extraction.transactionTime,
      subtotal: extraction.subtotal,
      tax: extraction.tax,
      tip: extraction.tip,
      total: extraction.total,
      currency: extraction.currency,
      paymentMethod: extraction.paymentMethod,
      last4Digits: extraction.last4Digits,
      aiConfidence: extraction.confidence,
      aiProvider: ai.providerName as never,
      extractedAt: new Date(),
    },
  });
}

// ─── Worker factory ───────────────────────────────────────────────────────────

export function createOCRWorker(
  redisUrl: string,
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
      await persistOCRRecord(prisma, receiptId, tenantId, ocr, ocrResult);

      const extraction = await ai.extractReceiptData({ ocrText: ocrResult.fullText });

      await persistLineItems(prisma, receiptId, tenantId, extraction.lineItems ?? []);
      await finaliseReceipt(prisma, receiptId, ai, extraction);

      logger.info({ receiptId }, 'OCR and AI extraction complete');
    },
    {
      connection: { url: redisUrl },
      concurrency: config.concurrency,
    },
  );
}

