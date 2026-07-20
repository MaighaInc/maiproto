import type { PrismaClient } from '@receiptflow/database';
import { NotFoundError } from '@receiptflow/shared/errors';

export interface PostJournalInput {
  journalEntryId: string;
  tenantId: string;
  organizationId: string;
  postedById: string;
}

export class AccountingService {
  constructor(private readonly prisma: PrismaClient) {}

  async getChartOfAccounts(tenantId: string, organizationId: string): Promise<unknown[]> {
    return this.prisma.chartOfAccount.findMany({
      where: { tenantId, organizationId, isActive: true },
      orderBy: [{ type: 'asc' }, { code: 'asc' }],
    });
  }

  async getJournalEntries(
    tenantId: string,
    organizationId: string,
    query: { page: number; pageSize: number; dateFrom?: string; dateTo?: string; status?: string },
  ): Promise<{ data: unknown[]; total: number }> {
    const where = {
      tenantId,
      organizationId,
      ...(query.status ? { status: query.status as never } : {}),
      ...(query.dateFrom || query.dateTo
        ? {
            entryDate: {
              ...(query.dateFrom ? { gte: new Date(query.dateFrom) } : {}),
              ...(query.dateTo ? { lte: new Date(query.dateTo) } : {}),
            },
          }
        : {}),

    };

    const [total, data] = await Promise.all([
      this.prisma.journalEntry.count({ where }),
      this.prisma.journalEntry.findMany({
        where,
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        orderBy: { entryDate: 'desc' },
        include: {
          lines: { include: { account: { select: { code: true, name: true } } } },
          receipt: { select: { id: true } },
        },
      }),
    ]);

    return { data, total };
  }

  async postJournalEntry(input: PostJournalInput): Promise<unknown> {
    const entry = await this.prisma.journalEntry.findFirst({
      where: { id: input.journalEntryId, tenantId: input.tenantId, organizationId: input.organizationId },
    });
    if (!entry) throw new NotFoundError('Journal entry not found');
    if (entry.status === 'POSTED') throw new NotFoundError('Already posted');

    return this.prisma.journalEntry.update({
      where: { id: input.journalEntryId },
      data: { status: 'POSTED', postedAt: new Date(), postedBy: input.postedById },
    });
  }

  async getBankAccounts(tenantId: string, organizationId: string): Promise<unknown[]> {
    return this.prisma.bankAccount.findMany({
      where: { tenantId, organizationId, isActive: true },
    });
  }

  async getBankTransactions(
    tenantId: string,
    _organizationId: string,
    bankAccountId: string,
    query: { page: number; pageSize: number },
  ): Promise<{ data: unknown[]; total: number }> {
    const where = { tenantId, bankAccountId };
    const [total, data] = await Promise.all([
      this.prisma.bankTransaction.count({ where }),
      this.prisma.bankTransaction.findMany({
        where,
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        orderBy: { postedAt: 'desc' },
        include: { matches: { include: { receipt: { select: { id: true, status: true } } } } },
      }),
    ]);
    return { data, total };
  }
}
