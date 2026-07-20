import { z } from 'zod';

// ─── Pagination ─────────────────────────────────────────────────────────────

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(100).default(25),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type PaginationInput = z.infer<typeof paginationSchema>;

// ─── Auth ────────────────────────────────────────────────────────────────────

export const registerSchema = z.object({
  email: z.string().email().max(255).toLowerCase(),
  password: z
    .string()
    .min(8)
    .max(128)
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/,
      'Password must contain uppercase, lowercase, digit, and special character',
    ),
  firstName: z.string().min(1).max(100).trim(),
  lastName: z.string().min(1).max(100).trim(),
  organizationName: z.string().min(1).max(255).trim().optional(),
  tenantSlug: z
    .string()
    .min(3)
    .max(63)
    .regex(/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/, 'Slug must be lowercase alphanumeric with hyphens')
    .optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.string().email().toLowerCase(),
  password: z.string().min(1),
  tenantSlug: z.string().min(1),
  mfaCode: z.preprocess((v) => (v === '' ? undefined : v), z.string().length(6).optional()),
  rememberMe: z.boolean().default(false),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const forgotPasswordSchema = z.object({
  email: z.string().email().toLowerCase(),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z
    .string()
    .min(8)
    .max(128)
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/),
});

export const verifyEmailSchema = z.object({
  token: z.string().min(1),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1),
});

// ─── Receipts ────────────────────────────────────────────────────────────────

export const receiptQuerySchema = paginationSchema.extend({
  status: z
    .enum(['DRAFT', 'PROCESSING', 'PROCESSED', 'MATCHED', 'APPROVED', 'REJECTED', 'ARCHIVED'])
    .optional(),
  categoryId: z.string().cuid().optional(),
  merchantName: z.string().max(255).optional(),
  from: z.string().datetime({ offset: true }).optional(),
  to: z.string().datetime({ offset: true }).optional(),
  minAmount: z.coerce.number().nonnegative().optional(),
  maxAmount: z.coerce.number().nonnegative().optional(),
  search: z.string().max(255).optional(),
  tagIds: z.array(z.string().cuid()).optional(),
});

export type ReceiptQueryInput = z.infer<typeof receiptQuerySchema>;

export const updateReceiptSchema = z.object({
  merchantName: z.string().max(255).optional(),
  merchantAddress: z.string().max(500).optional(),
  merchantPhone: z.string().max(50).optional(),
  transactionDate: z.string().datetime({ offset: true }).optional(),
  subtotal: z.number().nonnegative().optional(),
  tax: z.number().nonnegative().optional(),
  tip: z.number().nonnegative().optional(),
  total: z.number().nonnegative().optional(),
  currency: z.string().length(3).toUpperCase().optional(),
  paymentMethod: z
    .enum(['CREDIT_CARD', 'DEBIT_CARD', 'CASH', 'CHECK', 'ACH', 'WIRE', 'CRYPTO', 'OTHER'])
    .optional(),
  last4Digits: z.string().length(4).regex(/^\d{4}$/).optional(),
  notes: z.string().max(5000).optional(),
  categoryId: z.string().cuid().optional(),
  glAccountId: z.string().cuid().optional(),
});

export type UpdateReceiptInput = z.infer<typeof updateReceiptSchema>;

// ─── Vendors ─────────────────────────────────────────────────────────────────

export const createVendorSchema = z.object({
  name: z.string().min(1).max(255).trim(),
  taxId: z.string().max(50).optional(),
  email: z.string().email().optional(),
  phone: z.string().max(50).optional(),
  website: z.string().url().optional(),
  address: z
    .object({
      street: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      postalCode: z.string().optional(),
      country: z.string().length(2).optional(),
    })
    .optional(),
  notes: z.string().max(5000).optional(),
});

export type CreateVendorInput = z.infer<typeof createVendorSchema>;

// ─── Accounting ──────────────────────────────────────────────────────────────

export const createJournalEntrySchema = z.object({
  receiptId: z.string().cuid().optional(),
  basis: z.enum(['CASH', 'ACCRUAL']).default('ACCRUAL'),
  description: z.string().max(1000).optional(),
  entryDate: z.string().datetime({ offset: true }),
  lines: z
    .array(
      z.object({
        accountId: z.string().cuid(),
        description: z.string().max(500).optional(),
        debit: z.number().nonnegative().optional(),
        credit: z.number().nonnegative().optional(),
      }),
    )
    .min(2)
    .refine(
      (lines) => {
        const totalDebit = lines.reduce((s, l) => s + (l.debit ?? 0), 0);
        const totalCredit = lines.reduce((s, l) => s + (l.credit ?? 0), 0);
        return Math.abs(totalDebit - totalCredit) < 0.01;
      },
      { message: 'Journal entry must balance: total debits must equal total credits' },
    ),
});

export type CreateJournalEntryInput = z.infer<typeof createJournalEntrySchema>;

// ─── Search ──────────────────────────────────────────────────────────────────

export const searchSchema = z.object({
  q: z.string().min(1).max(500),
  type: z.enum(['receipt', 'vendor', 'all']).default('all'),
  from: z.string().datetime({ offset: true }).optional(),
  to: z.string().datetime({ offset: true }).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export type SearchInput = z.infer<typeof searchSchema>;

export const aiSearchSchema = z.object({
  query: z.string().min(1).max(1000),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export type AiSearchInput = z.infer<typeof aiSearchSchema>;

// ─── Webhooks ────────────────────────────────────────────────────────────────

export const createWebhookSchema = z.object({
  url: z.string().url().startsWith('https://'),
  events: z
    .array(z.string())
    .min(1)
    .refine((events) => events.every((e) => (WEBHOOK_EVENTS as readonly string[]).includes(e)), {
      message: 'Invalid webhook event',
    }),
});

export const WEBHOOK_EVENTS = [
  'receipt.uploaded',
  'receipt.processed',
  'receipt.approved',
  'receipt.rejected',
  'receipt.duplicate_detected',
  'approval.requested',
  'approval.approved',
  'approval.rejected',
  'subscription.updated',
] as const;

export type WebhookEvent = (typeof WEBHOOK_EVENTS)[number];
