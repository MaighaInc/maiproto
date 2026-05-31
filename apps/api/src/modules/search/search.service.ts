import type { PrismaClient } from '@receiptflow/database';
import type { IAIProvider } from '@receiptflow/ai';

export class SearchService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly ai: IAIProvider,
  ) {}

  async search(
    tenantId: string,
    organizationId: string,
    query: string,
    page: number,
    pageSize: number,
  ): Promise<{ data: unknown[]; total: number }> {
    const where = {
      tenantId,
      organizationId,
      deletedAt: null,
      OR: [
        {
          metadata: {
            merchantName: { contains: query, mode: 'insensitive' as const },
          },
        },
        {
          vendor: { name: { contains: query, mode: 'insensitive' as const } },
        },
      ],
    };

    const [total, data] = await Promise.all([
      this.prisma.receipt.count({ where }),
      this.prisma.receipt.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          vendor: { select: { id: true, name: true } },
          metadata: { select: { merchantName: true, total: true, transactionDate: true } },
          category: { select: { id: true, name: true } },
        },
      }),
    ]);

    return { data, total };
  }

  async aiSearch(
    tenantId: string,
    organizationId: string,
    query: string,
    page: number,
    pageSize: number,
  ): Promise<{ data: unknown[]; total: number; parsedFilters: unknown }> {
    const filters = await this.ai.parseSearchQuery(query);

    const where: Record<string, unknown> = {
      tenantId,
      organizationId,
      deletedAt: null,
    };

    if (filters.amountMin !== undefined || filters.amountMax !== undefined) {
      where['total'] = {
        ...(filters.amountMin !== undefined ? { gte: BigInt(Math.round(filters.amountMin * 100)) } : {}),
        ...(filters.amountMax !== undefined ? { lte: BigInt(Math.round(filters.amountMax * 100)) } : {}),
      };
    }

    if (filters.dateFrom ?? filters.dateTo) {
      where['transactionDate'] = {
        ...(filters.dateFrom ? { gte: new Date(filters.dateFrom) } : {}),
        ...(filters.dateTo ? { lte: new Date(filters.dateTo) } : {}),
      };
    }

    if (filters.vendor) {
      where['vendor'] = { name: { contains: filters.vendor, mode: 'insensitive' } };
    }

    const [total, data] = await Promise.all([
      this.prisma.receipt.count({ where: where as never }),
      this.prisma.receipt.findMany({
        where: where as never,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          vendor: { select: { id: true, name: true } },
          metadata: { select: { merchantName: true, total: true, transactionDate: true } },
          category: { select: { id: true, name: true } },
        },
      }),
    ]);

    return { data, total, parsedFilters: filters };
  }
}
