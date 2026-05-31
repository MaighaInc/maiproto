import { Worker, type Job } from 'bullmq';
import type { Redis } from 'ioredis';
import type { PrismaClient } from '@receiptflow/database';
import type { IEmailProvider } from '@receiptflow/notifications';
import { receiptApprovalRequestTemplate } from '@receiptflow/notifications';
import { QUEUE_NAMES } from '@receiptflow/shared/constants';
import type { Logger } from 'pino';

export interface NotificationJobData {
  type: 'APPROVAL_REQUEST' | 'RECEIPT_PROCESSED' | 'EXPORT_READY' | 'DIGEST';
  payload: Record<string, unknown>;
  tenantId: string;
}

export interface NotificationWorkerConfig {
  concurrency: number;
}

export function createNotificationWorker(
  redis: Redis,
  prisma: PrismaClient,
  emailProvider: IEmailProvider,
  emailFrom: { email: string; name: string },
  logger: Logger,
  config: NotificationWorkerConfig,
): Worker {
  return new Worker<NotificationJobData>(
    QUEUE_NAMES.NOTIFICATIONS,
    async (job: Job<NotificationJobData>) => {
      const { type, payload } = job.data;
      logger.info({ type, jobId: job.id }, 'Processing notification job');

      switch (type) {
        case 'APPROVAL_REQUEST':
          await handleApprovalRequest(prisma, emailProvider, emailFrom, payload);
          break;
        case 'RECEIPT_PROCESSED':
          await handleReceiptProcessed(prisma, emailProvider, emailFrom, payload);
          break;
        default:
          logger.warn({ type }, 'Unknown notification type');
      }
    },
    { connection: redis, concurrency: config.concurrency },
  );
}

async function handleApprovalRequest(
  prisma: PrismaClient,
  emailProvider: IEmailProvider,
  emailFrom: { email: string; name: string },
  payload: Record<string, unknown>,
): Promise<void> {
  const { approvalId } = payload as { approvalId: string };

  const approval = await prisma.approval.findFirst({
    where: { id: approvalId, deletedAt: null },
    include: {
      assignee: { select: { email: true, firstName: true, lastName: true } },
      receipt: {
        include: {
          metadata: { select: { merchantName: true, total: true } },
          uploadedBy: { select: { firstName: true, lastName: true } },
        },
      },
    },
  });

  if (!approval) return;

  const template = receiptApprovalRequestTemplate({
    approverName: approval.assignee.firstName,
    submitterName: `${approval.receipt.uploadedBy.firstName} ${approval.receipt.uploadedBy.lastName}`,
    receiptId: approval.receiptId,
    vendor: approval.receipt.metadata?.merchantName ?? 'Unknown',
    amount: approval.receipt.metadata?.total
      ? `$${(Number(approval.receipt.metadata.total) / 100).toFixed(2)}`
      : 'N/A',
  });

  await emailProvider.send({
    from: emailFrom,
    to: { email: approval.assignee.email, name: `${approval.assignee.firstName} ${approval.assignee.lastName}` },
    ...template,
  });
}

async function handleReceiptProcessed(
  prisma: PrismaClient,
  emailProvider: IEmailProvider,
  emailFrom: { email: string; name: string },
  payload: Record<string, unknown>,
): Promise<void> {
  // Stub — implement as needed
  const { receiptId } = payload as { receiptId: string };
  const receipt = await prisma.receipt.findFirst({
    where: { id: receiptId, deletedAt: null },
    include: { uploadedBy: { select: { email: true, firstName: true } } },
  });
  if (!receipt) return;

  await emailProvider.send({
    from: emailFrom,
    to: { email: receipt.uploadedBy.email, name: receipt.uploadedBy.firstName },
    subject: 'Your receipt has been processed',
    html: `<p>Hi ${receipt.uploadedBy.firstName}, your receipt has been processed and is ready to review.</p>`,
    text: `Hi ${receipt.uploadedBy.firstName}, your receipt has been processed.`,
  });
}
