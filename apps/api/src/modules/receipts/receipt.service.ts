import type { PrismaClient, Prisma } from '@receiptflow/database';
import type { IStorageProvider } from '@receiptflow/storage';
import { Queue } from 'bullmq';
import type { Redis } from 'ioredis';
import { NotFoundError, PermissionError, BusinessRuleError } from '@receiptflow/shared/errors';
import { QUEUE_NAMES, ALLOWED_MIME_TYPES, MAX_FILE_SIZE_BYTES, MAX_FILES_PER_UPLOAD } from '@receiptflow/shared/constants';
import { receiptFileKey } from '@receiptflow/storage';
import { randomUUID } from 'node:crypto';

export interface ReceiptServiceConfig {
  /** BullMQ job retry attempts for the OCR queue */
  ocrJobAttempts: number;
  /** Initial backoff delay (ms) for exponential retry */
  ocrJobBackoffDelayMs: number;
}

export interface ReceiptUploadInput {
  organizationId: string;
  tenantId: string;
  uploadedById: string;
  files: Array<{
    originalname: string;
    mimetype: string;
    buffer: Buffer;
    size: number;
  }>;
}

export interface ReceiptQueryInput {
  organizationId: string;
  tenantId: string;
  page: number;
  pageSize: number;
  status?: string;
  vendorId?: string;
  categoryId?: string;
  dateFrom?: string;
  dateTo?: string;
  amountMin?: number;
  amountMax?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export class ReceiptService {
  private readonly ocrQueue: Queue;

  constructor(
    private readonly prisma: PrismaClient,
    private readonly storage: IStorageProvider,
    redis: Redis,
    config: ReceiptServiceConfig,
  ) {
    this.ocrQueue = new Queue(QUEUE_NAMES.OCR, {
      connection: redis,
      defaultJobOptions: {
        attempts: config.ocrJobAttempts,
        backoff: { type: 'exponential', delay: config.ocrJobBackoffDelayMs },
      },
    });
  }

  async uploadReceipts(input: ReceiptUploadInput): Promise<{ receiptIds: string[] }> {
    if (input.files.length > MAX_FILES_PER_UPLOAD) {
      throw new BusinessRuleError(`Maximum ${MAX_FILES_PER_UPLOAD} files per upload`);
    }

    for (const file of input.files) {
      if (!ALLOWED_MIME_TYPES.includes(file.mimetype as never)) {
        throw new BusinessRuleError(`Unsupported file type: ${file.mimetype}`);
      }
      if (file.size > MAX_FILE_SIZE_BYTES) {
        throw new BusinessRuleError(`File ${file.originalname} exceeds maximum size limit`);
      }
    }

    // Process all files in parallel — validated above so safe to fan-out
    const receiptIds = await Promise.all(
      input.files.map((file) => this.processOneFile(input, file)),
    );

    return { receiptIds };
  }

  private async processOneFile(
    input: Omit<ReceiptUploadInput, 'files'>,
    file: ReceiptUploadInput['files'][number],
  ): Promise<string> {
    const receiptId = randomUUID();
    const fileKey = receiptFileKey(input.tenantId, input.organizationId, receiptId, file.originalname);

    await this.storage.upload(fileKey, file.buffer, {
      contentType: file.mimetype,
      metadata: {
        receiptId,
        originalName: file.originalname,
        uploadedBy: input.uploadedById,
      },
    });

    await this.prisma.receipt.create({
      data: {
        id: receiptId,
        tenantId: input.tenantId,
        organizationId: input.organizationId,
        uploadedById: input.uploadedById,
        status: 'PENDING',
        files: {
          create: {
            tenantId: input.tenantId,
            storageKey: fileKey,
            originalName: file.originalname,
            mimeType: file.mimetype,
            fileSize: BigInt(file.size),
          },
        },
      },
    });

    await this.ocrQueue.add('process-receipt', {
      receiptId,
      tenantId: input.tenantId,
      organizationId: input.organizationId,
      storageKey: fileKey,
      mimeType: file.mimetype,
    });

    return receiptId;
  }

  async getReceipts(input: ReceiptQueryInput): Promise<{
    data: unknown[];
    pagination: { page: number; pageSize: number; total: number; totalPages: number };
  }> {
    const where: Prisma.ReceiptWhereInput = {
      tenantId: input.tenantId,
      organizationId: input.organizationId,
      deletedAt: null,
      ...(input.status ? { status: input.status as never } : {}),
      ...(input.vendorId ? { vendorId: input.vendorId } : {}),
      ...(input.categoryId ? { categoryId: input.categoryId } : {}),
      ...(input.dateFrom || input.dateTo
        ? {
            transactionDate: {
              ...(input.dateFrom ? { gte: new Date(input.dateFrom) } : {}),
              ...(input.dateTo ? { lte: new Date(input.dateTo) } : {}),
            },
          }
        : {}),
      ...(input.amountMin !== undefined || input.amountMax !== undefined
        ? {
            total: {
              ...(input.amountMin !== undefined ? { gte: BigInt(Math.round(input.amountMin * 100)) } : {}),
              ...(input.amountMax !== undefined ? { lte: BigInt(Math.round(input.amountMax * 100)) } : {}),
            },
          }
        : {}),
      ...(input.search
        ? {
            OR: [
              { metadata: { path: ['merchantName'], string_contains: input.search } },
              { vendor: { name: { contains: input.search, mode: 'insensitive' } } },
            ],
          }
        : {}),
    };

    const [total, data] = await Promise.all([
      this.prisma.receipt.count({ where }),
      this.prisma.receipt.findMany({
        where,
        skip: (input.page - 1) * input.pageSize,
        take: input.pageSize,
        orderBy: input.sortBy
          ? { [input.sortBy]: input.sortOrder ?? 'desc' }
          : { createdAt: 'desc' },
        select: {
          id: true,
          status: true,
          transactionDate: true,
          total: true,
          createdAt: true,
          vendor: { select: { id: true, name: true } },
          category: { select: { id: true, name: true, code: true } },
          files: { select: { id: true, mimeType: true, fileSize: true }, take: 1 },
          metadata: { select: { merchantName: true, total: true, transactionDate: true } },
        },
      }),
    ]);

    return {
      data,
      pagination: {
        page: input.page,
        pageSize: input.pageSize,
        total,
        totalPages: Math.ceil(total / input.pageSize),
      },
    };
  }

  async getReceiptById(id: string, tenantId: string, organizationId: string): Promise<unknown> {
    const receipt = await this.prisma.receipt.findFirst({
      where: { id, tenantId, organizationId, deletedAt: null },
      include: {
        files: true,
        metadata: true,
        lineItems: true,
        vendor: true,
        category: true,
        tags: { include: { tag: true } },
        comments: {
          where: { deletedAt: null },
          include: { user: { select: { id: true, firstName: true, lastName: true } } },
          orderBy: { createdAt: 'asc' },
        },
        approvals: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: { assignee: { select: { id: true, firstName: true, lastName: true } } },
        },
      },
    });
    if (!receipt) throw new NotFoundError('Receipt not found');
    return receipt;
  }

  async deleteReceipt(id: string, tenantId: string, organizationId: string, userId: string): Promise<void> {
    const receipt = await this.prisma.receipt.findFirst({
      where: { id, tenantId, organizationId, deletedAt: null },
      select: { id: true, uploadedById: true, status: true },
    });
    if (!receipt) throw new NotFoundError('Receipt not found');
    if (receipt.uploadedById !== userId) throw new PermissionError('Cannot delete another user\'s receipt');
    if (receipt.status === 'APPROVED') throw new BusinessRuleError('Approved receipts cannot be deleted');

    await this.prisma.receipt.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async getPresignedUploadUrl(
    tenantId: string,
    organizationId: string,
    filename: string,
    mimeType: string,
  ): Promise<{ url: string; key: string }> {
    const key = receiptFileKey(tenantId, organizationId, randomUUID(), filename);
    const url = await this.storage.presignUpload(key, { expiresIn: 3600, contentType: mimeType });
    return { url, key };
  }
}

