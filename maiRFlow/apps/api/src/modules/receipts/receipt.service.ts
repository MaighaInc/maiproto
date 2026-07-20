import type { PrismaClient, Prisma, StorageProvider } from '@receiptflow/database';
import type { IStorageProvider } from '@receiptflow/storage';
import { Queue } from 'bullmq';
import { NotFoundError, PermissionError, BusinessRuleError } from '@receiptflow/shared/errors';
import { QUEUE_NAMES, ALLOWED_MIME_TYPES, MAX_FILE_SIZE_BYTES, MAX_FILES_PER_UPLOAD } from '@receiptflow/shared/constants';
import { receiptFileKey } from '@receiptflow/storage';
import { randomUUID, createHash } from 'node:crypto';

export interface ReceiptServiceConfig {
  /** BullMQ job retry attempts for the OCR queue */
  ocrJobAttempts: number;
  /** Initial backoff delay (ms) for exponential retry */
  ocrJobBackoffDelayMs: number;
  /** Storage provider in use (for tagging uploaded files) */
  storageProvider: StorageProvider;
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
    redisUrl: string,
    private readonly config: ReceiptServiceConfig,
  ) {
    this.ocrQueue = new Queue(QUEUE_NAMES.OCR, {
      connection: { url: redisUrl },
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

    const checksum = createHash('sha256').update(file.buffer).digest('hex');
    await this.prisma.receipt.create({
      data: {
        id: receiptId,
        tenantId: input.tenantId,
        organizationId: input.organizationId,
        createdBy: input.uploadedById,
        updatedBy: input.uploadedById,
        status: 'DRAFT',
        files: {
          create: {
            tenantId: input.tenantId,
            organizationId: input.organizationId,
            storageKey: fileKey,
            originalName: file.originalname,
            mimeType: file.mimetype,
            sizeBytes: file.size,
            storageProvider: this.config.storageProvider,
            checksum,
            createdBy: input.uploadedById,
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
              ...(input.amountMin !== undefined ? { gte: input.amountMin } : {}),
              ...(input.amountMax !== undefined ? { lte: input.amountMax } : {}),
            },
          }
        : {}),
      ...(input.search
        ? {
            OR: [
              { merchantName: { contains: input.search, mode: 'insensitive' } },
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
          merchantName: true,
          transactionDate: true,
          total: true,
          createdAt: true,
          category: { select: { id: true, name: true, code: true } },
          files: { select: { id: true, mimeType: true, sizeBytes: true }, take: 1 },
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
        },
      },
    });
    if (!receipt) throw new NotFoundError('Receipt not found');
    return receipt;
  }

  async deleteReceipt(id: string, tenantId: string, organizationId: string, userId: string): Promise<void> {
    const receipt = await this.prisma.receipt.findFirst({
      where: { id, tenantId, organizationId, deletedAt: null },
      select: { id: true, createdBy: true, status: true },
    });
    if (!receipt) throw new NotFoundError('Receipt not found');
    if (receipt.createdBy !== userId) throw new PermissionError('Cannot delete another user\'s receipt');
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

