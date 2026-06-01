import { Worker, type Job } from 'bullmq';
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
  redisUrl: string,
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
    { connection: { url: redisUrl }, concurrency: config.concurrency },
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
    where: { id: approvalId },
    include: {
      requester: { select: { firstName: true, lastName: true } },
      receipt: true,
      workflow: {
        include: {
          steps: { take: 1, orderBy: { stepOrder: 'asc' } },
        },
      },
    },
  });

  if (!approval) return;

  // Find the approver from the first workflow step
  const approverStep = approval.workflow.steps[0];
  if (!approverStep) return;

  const approver = await prisma.user.findUnique({
    where: { id: approverStep.approverId },
    select: { email: true, firstName: true, lastName: true },
  });

  if (!approver) return;

  const template = receiptApprovalRequestTemplate({
    approverName: approver.firstName,
    submitterName: `${approval.requester.firstName} ${approval.requester.lastName}`,
    receiptId: approval.receiptId,
    vendor: approval.receipt.merchantName ?? 'Unknown',
    amount: approval.receipt.total
      ? `$${Number(approval.receipt.total).toFixed(2)}`
      : 'N/A',
  });

  await emailProvider.send({
    from: emailFrom,
    to: { email: approver.email, name: `${approver.firstName} ${approver.lastName}` },
    ...template,
  });
}

async function handleReceiptProcessed(
  prisma: PrismaClient,
  emailProvider: IEmailProvider,
  emailFrom: { email: string; name: string },
  payload: Record<string, unknown>,
): Promise<void> {
  const { receiptId } = payload as { receiptId: string };
  const receipt = await prisma.receipt.findFirst({
    where: { id: receiptId },
  });
  if (!receipt) return;

  const uploader = await prisma.user.findUnique({
    where: { id: receipt.createdBy },
    select: { email: true, firstName: true },
  });
  if (!uploader) return;

  await emailProvider.send({
    from: emailFrom,
    to: { email: uploader.email, name: uploader.firstName },
    subject: 'Your receipt has been processed',
    html: `<p>Hi ${uploader.firstName}, your receipt has been processed and is ready to review.</p>`,
    text: `Hi ${uploader.firstName}, your receipt has been processed.`,
  });
}
