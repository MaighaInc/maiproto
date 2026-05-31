import type { PrismaClient } from '@receiptflow/database';
import { NotFoundError, BusinessRuleError } from '@receiptflow/shared/errors';

export class ApprovalService {
  constructor(private readonly prisma: PrismaClient) {}

  async getPendingApprovals(userId: string, tenantId: string, organizationId: string): Promise<unknown[]> {
    return this.prisma.approval.findMany({
      where: {
        assigneeId: userId,
        tenantId,
        organizationId,
        status: 'PENDING',
        deletedAt: null,
        dueAt: { gt: new Date() },
      },
      include: {
        receipt: {
          include: {
            metadata: { select: { merchantName: true, total: true, transactionDate: true } },
            vendor: { select: { id: true, name: true } },
          },
        },
        workflow: { select: { name: true } },
      },
      orderBy: { dueAt: 'asc' },
    });
  }

  async approve(
    approvalId: string,
    userId: string,
    tenantId: string,
    comment?: string,
  ): Promise<void> {
    const approval = await this.prisma.approval.findFirst({
      where: { id: approvalId, assigneeId: userId, tenantId, status: 'PENDING', deletedAt: null },
      include: { receipt: true },
    });
    if (!approval) throw new NotFoundError('Approval not found or not assigned to you');

    await this.prisma.$transaction(async (tx) => {
      await tx.approval.update({
        where: { id: approvalId },
        data: { status: 'APPROVED', decidedAt: new Date() },
      });

      if (comment) {
        await tx.approvalComment.create({
          data: { approvalId, userId, content: comment },
        });
      }

      // Check if all approvals for this receipt are approved → mark receipt APPROVED
      const pendingCount = await tx.approval.count({
        where: { receiptId: approval.receiptId, status: 'PENDING', deletedAt: null },
      });
      if (pendingCount === 0) {
        await tx.receipt.update({
          where: { id: approval.receiptId },
          data: { status: 'APPROVED', approvedAt: new Date(), approvedById: userId },
        });
      }
    });
  }

  async reject(
    approvalId: string,
    userId: string,
    tenantId: string,
    reason: string,
  ): Promise<void> {
    if (!reason.trim()) throw new BusinessRuleError('Rejection reason is required');

    const approval = await this.prisma.approval.findFirst({
      where: { id: approvalId, assigneeId: userId, tenantId, status: 'PENDING', deletedAt: null },
    });
    if (!approval) throw new NotFoundError('Approval not found or not assigned to you');

    await this.prisma.$transaction([
      this.prisma.approval.update({
        where: { id: approvalId },
        data: { status: 'REJECTED', decidedAt: new Date() },
      }),
      this.prisma.approvalComment.create({
        data: { approvalId, userId, content: reason },
      }),
      this.prisma.receipt.update({
        where: { id: approval.receiptId },
        data: { status: 'REJECTED' },
      }),
    ]);
  }
}
