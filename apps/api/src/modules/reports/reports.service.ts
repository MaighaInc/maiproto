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
    const [byCategoryAgg, byVendorAgg, totals] = await Promise.all([
      this.prisma.receipt.groupBy({
        by: ['categoryId'],
        where: { ...filter, categoryId: { not: null } },
        _sum: { total: true },
        _count: { id: true },
      }),
      this.prisma.receipt.groupBy({
        by: ['vendorId'],
        where: { ...filter, vendorId: { not: null } },
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
    const vendorIds = byVendorAgg.map((r) => r.vendorId).filter(Boolean) as string[];

    const [categories, vendors] = await Promise.all([
      categoryIds.length
        ? this.prisma.category.findMany({
            where: { id: { in: categoryIds } },
            select: { id: true, name: true, code: true },
          })
        : Promise.resolve([]),
      vendorIds.length
        ? this.prisma.vendor.findMany({
            where: { id: { in: vendorIds } },
            select: { id: true, name: true },
          })
        : Promise.resolve([]),
    ]);

    const categoryMap = new Map(categories.map((c) => [c.id, c]));
    const vendorMap = new Map(vendors.map((v) => [v.id, v]));

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

    const byVendor = Object.fromEntries(
      byVendorAgg.map((r) => {
        const v = vendorMap.get(r.vendorId!);
        return [
          r.vendorId!,
          {
            name: v?.name ?? 'Unknown',
            total: fromCents(Number(r._sum.total ?? 0n)),
            count: r._count.id,
          },
        ];
      }),
    );

    return {
      grandTotal: fromCents(Number(totals._sum.total ?? 0n)),
      receiptCount: totals._count.id,
      byCategory,
      byVendor,
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
      this.prisma.receiptMetadata.aggregate({
        where: {
          receipt: {
            tenantId,
            organizationId,
            status: 'APPROVED',
            transactionDate: { gte: dateFrom, lte: dateTo },
            deletedAt: null,
          },
        },
        _sum: { total: true, tax: true, subtotal: true },
        _count: { receiptId: true },
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
          vendor: { select: { name: true } },
          metadata: { select: { total: true, tax: true, subtotal: true } },
        },
        orderBy: { transactionDate: 'asc' },
      }),
    ]);

    const rowData = rows.map((r) => ({
      receiptId: r.id,
      vendor: r.vendor?.name ?? 'Unknown',
      date: r.transactionDate,
      subtotal: fromCents(Number(r.metadata?.subtotal ?? 0n)),
      tax: fromCents(Number(r.metadata?.tax ?? 0n)),
      total: fromCents(Number(r.metadata?.total ?? 0n)),
    }));

    return {
      rows: rowData,
      totalTax: fromCents(Number(taxTotals._sum.tax ?? 0n)),
      totalAmount: fromCents(Number(taxTotals._sum.total ?? 0n)),
      receiptCount: taxTotals._count.receiptId,
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
          entityType: true,
          entityId: true,
          createdAt: true,
          user: { select: { id: true, firstName: true, lastName: true, email: true } },
        },
      }),
    ]);
    return { data, total };
  }
}

