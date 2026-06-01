import type { PrismaClient, Prisma } from '@receiptflow/database';
import { NotFoundError, ConflictError } from '@receiptflow/shared/errors';

export interface CreateVendorInput {
  tenantId: string;
  organizationId: string;
  name: string;
  website?: string;
  taxId?: string;
  defaultCategoryId?: string;
  defaultTaxTreatmentId?: string;
  notes?: string;
}

export class VendorService {
  constructor(private readonly prisma: PrismaClient) {}

  async createVendor(input: CreateVendorInput): Promise<unknown> {
    const existing = await this.prisma.vendor.findFirst({
      where: {
        tenantId: input.tenantId,
        organizationId: input.organizationId,
        name: { equals: input.name, mode: 'insensitive' },
        deletedAt: null,
      },
    });
    if (existing) throw new ConflictError('A vendor with this name already exists');

    return this.prisma.vendor.create({
      data: {
        tenantId: input.tenantId,
        organizationId: input.organizationId,
        name: input.name,
        normalizedName: input.name.toLowerCase().trim(),
        website: input.website ?? null,
        taxId: input.taxId ?? null,
        notes: input.notes ?? null,
        createdBy: '',
        updatedBy: '',
      },
    });
  }

  async getVendors(
    tenantId: string,
    organizationId: string,
    query: { page: number; pageSize: number; search?: string },
  ): Promise<{ data: unknown[]; total: number }> {
    const where: Prisma.VendorWhereInput = {
      tenantId,
      organizationId,
      deletedAt: null,
      ...(query.search
        ? { name: { contains: query.search, mode: 'insensitive' } }
        : {}),
    };

    const [total, data] = await Promise.all([
      this.prisma.vendor.count({ where }),
      this.prisma.vendor.findMany({
        where,
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        orderBy: { name: 'asc' },
      }),
    ]);

    return { data, total };
  }

  async getVendorById(id: string, tenantId: string, organizationId: string): Promise<unknown> {
    const vendor = await this.prisma.vendor.findFirst({
      where: { id, tenantId, organizationId, deletedAt: null },
      include: {
        aliases: true,
      },
    });
    if (!vendor) throw new NotFoundError('Vendor not found');
    return vendor;
  }

  async deleteVendor(id: string, tenantId: string, organizationId: string): Promise<void> {
    const vendor = await this.prisma.vendor.findFirst({
      where: { id, tenantId, organizationId, deletedAt: null },
    });
    if (!vendor) throw new NotFoundError('Vendor not found');
    await this.prisma.vendor.update({ where: { id }, data: { deletedAt: new Date() } });
  }
}
