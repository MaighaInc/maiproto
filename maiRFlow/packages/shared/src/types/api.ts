/**
 * Standardized API response format used across all endpoints.
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data: T;
  meta?: PaginationMeta | Record<string, unknown>;
  errors?: ApiError[];
  requestId?: string;
}

export interface ApiError {
  code: string;
  message: string;
  field?: string;
  details?: unknown;
}

export interface PaginationMeta {
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface PaginationQuery {
  page?: number;
  perPage?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface DateRangeQuery {
  from?: string;
  to?: string;
}

/**
 * Standard tenant-scoped record base.
 * Every business record extends this.
 */
export interface TenantRecord {
  id: string;
  tenantId: string;
  organizationId: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
  createdBy: string;
  updatedBy: string;
}

export type SortOrder = 'asc' | 'desc';

export interface PaginatedResult<T> {
  items: T[];
  meta: PaginationMeta;
}
