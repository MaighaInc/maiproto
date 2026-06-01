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
        { merchantName: { contains: query, mode: 'insensitive' as const } },
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

    if (filters.minAmount !== undefined || filters.maxAmount !== undefined) {
      where['total'] = {
        ...(filters.minAmount !== undefined ? { gte: BigInt(Math.round(filters.minAmount * 100)) } : {}),
        ...(filters.maxAmount !== undefined ? { lte: BigInt(Math.round(filters.maxAmount * 100)) } : {}),
      };
    }

    if (filters.from ?? filters.to) {
      where['transactionDate'] = {
        ...(filters.from ? { gte: filters.from } : {}),
        ...(filters.to ? { lte: filters.to } : {}),
      };
    }

    const [total, data] = await Promise.all([
      this.prisma.receipt.count({ where: where as never }),
      this.prisma.receipt.findMany({
        where: where as never,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          category: { select: { id: true, name: true } },
        },
      }),
    ]);

    return { data, total, parsedFilters: filters };
  }
}
