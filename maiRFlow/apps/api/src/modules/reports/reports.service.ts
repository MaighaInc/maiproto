import type { PrismaClient } from '@receiptflow/database';
import { fromCents } from '@receiptflow/shared/utils';

export class ReportsService {
  constructor(private readonly prisma: PrismaClient) {}

  async expenseSummary(
    tenantId: string,
    organizationId: string,
    dateFrom: Date,
    dateTo: Date,
  ): Promise<unknown> {
    const filter = {
      tenantId,
      organizationId,
      status: 'APPROVED' as const,
      transactionDate: { gte: dateFrom, lte: dateTo },
      deletedAt: null,
    };

    // Run aggregations in parallel — no full-table JS scan
    const [byCategoryAgg, totals] = await Promise.all([
      this.prisma.receipt.groupBy({
        by: ['categoryId'],
        where: { ...filter, categoryId: { not: null } },
        _sum: { total: true },
        _count: { id: true },
      }),
      this.prisma.receipt.aggregate({
        where: filter,
        _sum: { total: true },
        _count: { id: true },
      }),
    ]);

    // Enrich with names in two queries (not N+1)
    const categoryIds = byCategoryAgg.map((r) => r.categoryId).filter(Boolean) as string[];

    const categories = categoryIds.length
      ? await this.prisma.expenseCategory.findMany({
          where: { id: { in: categoryIds } },
          select: { id: true, name: true, code: true },
        })
      : [];

    const categoryMap = new Map(categories.map((c) => [c.id, c]));

    const byCategory = Object.fromEntries(
      byCategoryAgg.map((r) => {
        const cat = categoryMap.get(r.categoryId!);
        return [
          r.categoryId!,
          {
            name: cat?.name ?? 'Unknown',
            code: cat?.code ?? null,
            total: fromCents(Number(r._sum.total ?? 0n)),
            count: r._count.id,
          },
        ];
      }),
    );

    return {
      grandTotal: fromCents(Number(totals._sum.total ?? 0)),
      receiptCount: totals._count.id,
      byCategory,
      dateRange: { from: dateFrom, to: dateTo },
    };
  }

  async taxReport(
    tenantId: string,
    organizationId: string,
    dateFrom: Date,
    dateTo: Date,
  ): Promise<unknown> {
    // Aggregate tax totals at DB level; only select fields needed
    const [taxTotals, rows] = await Promise.all([
      this.prisma.receipt.aggregate({
        where: {
          tenantId,
          organizationId,
          status: 'APPROVED',
          transactionDate: { gte: dateFrom, lte: dateTo },
          deletedAt: null,
        },
        _sum: { total: true, tax: true, subtotal: true },
        _count: { id: true },
      }),
      this.prisma.receipt.findMany({
        where: {
          tenantId,
          organizationId,
          status: 'APPROVED',
          transactionDate: { gte: dateFrom, lte: dateTo },
          deletedAt: null,
        },
        select: {
          id: true,
          transactionDate: true,
          merchantName: true,
          total: true,
          tax: true,
          subtotal: true,
        },
        orderBy: { transactionDate: 'asc' },
      }),
    ]);

    const rowData = rows.map((r) => ({
      receiptId: r.id,
      vendor: r.merchantName ?? 'Unknown',
      date: r.transactionDate,
      subtotal: fromCents(Number(r.subtotal ?? 0)),
      tax: fromCents(Number(r.tax ?? 0)),
      total: fromCents(Number(r.total ?? 0)),
    }));

    return {
      rows: rowData,
      totalTax: fromCents(Number(taxTotals._sum.tax ?? 0)),
      totalAmount: fromCents(Number(taxTotals._sum.total ?? 0)),
      receiptCount: taxTotals._count.id,
    };
  }

  async auditReport(
    tenantId: string,
    dateFrom: Date,
    dateTo: Date,
    page: number,
    pageSize: number,
  ): Promise<{ data: unknown[]; total: number }> {
    const where = {
      tenantId,
      createdAt: { gte: dateFrom, lte: dateTo },
    };
    const [total, data] = await Promise.all([
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          action: true,
          resource: true,
          resourceId: true,
          createdAt: true,
          user: { select: { id: true, firstName: true, lastName: true, email: true } },
        },
      }),
    ]);
    return { data, total };
  }
}

