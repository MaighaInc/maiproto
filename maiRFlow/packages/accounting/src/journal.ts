import { BusinessRuleError } from '@receiptflow/shared/errors';

/**
 * Represents a double-entry accounting line before persistence.
 */
export interface JournalLineInput {
  accountCode: string;
  description: string;
  debitAmount: bigint;
  creditAmount: bigint;
  currency: string;
}

/**
 * Input needed to auto-generate a journal entry from a receipt.
 */
export interface ReceiptJournalInput {
  receiptId: string;
  organizationId: string;
  tenantId: string;
  transactionDate: Date;
  vendorName: string;
  total: bigint;           // in cents
  tax: bigint;             // in cents
  expenseAccountCode: string;
  taxAccountCode: string;
  payableAccountCode: string;
  currency: string;
  reference: string;
  description: string;
  createdByUserId: string;
}

export type JournalLinePayload = {
  accountCode: string;
  description: string;
  debitAmount: bigint;
  creditAmount: bigint;
  currency: string;
};

/**
 * Intermediate representation of a journal entry before persistence.
 * The caller is responsible for resolving accountCode → accountId,
 * generating entryNumber, and mapping fields to Prisma types.
 */
export type JournalEntryCreateInput = {
  organizationId: string;
  tenantId: string;
  receiptId: string;
  transactionDate: Date;
  reference: string;
  description: string;
  currency: string;
  totalAmount: bigint;
  status: string;
  basis: string;
  createdByUserId: string;
  lines: JournalLinePayload[];
};

/**
 * Generate a balanced double-entry journal entry from a receipt.
 *
 * Standard treatment:
 *   Dr  Expense Account     (total - tax)
 *   Dr  Tax Receivable/VAT  (tax)
 *   Cr  Accounts Payable    (total)
 */
export function buildReceiptJournalEntry(input: ReceiptJournalInput): JournalEntryCreateInput {
  const netAmount = input.total - input.tax;
  if (netAmount < 0n) {
    throw new BusinessRuleError('Tax amount cannot exceed receipt total');
  }

  const lines: JournalLineInput[] = [
    {
      accountCode: input.expenseAccountCode,
      description: `Expense: ${input.vendorName}`,
      debitAmount: netAmount,
      creditAmount: 0n,
      currency: input.currency,
    },
    ...(input.tax > 0n
      ? [
          {
            accountCode: input.taxAccountCode,
            description: `Tax: ${input.vendorName}`,
            debitAmount: input.tax,
            creditAmount: 0n,
            currency: input.currency,
          },
        ]
      : []),
    {
      accountCode: input.payableAccountCode,
      description: `Payable: ${input.vendorName}`,
      debitAmount: 0n,
      creditAmount: input.total,
      currency: input.currency,
    },
  ];

  validateBalance(lines);

  return {
    organizationId: input.organizationId,
    tenantId: input.tenantId,
    receiptId: input.receiptId,
    transactionDate: input.transactionDate,
    reference: input.reference,
    description: input.description,
    currency: input.currency,
    totalAmount: input.total,
    status: 'DRAFT',
    basis: 'ACCRUAL',
    createdByUserId: input.createdByUserId,
    lines: lines.map((l) => ({
      accountCode: l.accountCode,
      description: l.description,
      debitAmount: l.debitAmount,
      creditAmount: l.creditAmount,
      currency: l.currency,
    })),
  };
}

export function validateBalance(lines: JournalLineInput[]): void {
  const totalDebits = lines.reduce((sum, l) => sum + l.debitAmount, 0n);
  const totalCredits = lines.reduce((sum, l) => sum + l.creditAmount, 0n);
  if (totalDebits !== totalCredits) {
    throw new BusinessRuleError(
      `Journal entry is not balanced: debits=${totalDebits} credits=${totalCredits}`,
    );
  }
}
