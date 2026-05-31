import { describe, it, expect } from 'vitest';
import { buildReceiptJournalEntry } from '../journal.js';

describe('buildReceiptJournalEntry', () => {
  const base = {
    receiptId: 'r1',
    organizationId: 'org1',
    tenantId: 'tenant1',
    transactionDate: new Date('2024-01-15'),
    vendorName: 'Acme Corp',
    total: 11000n,   // $110.00
    tax: 1000n,      // $10.00
    expenseAccountCode: '5000',
    taxAccountCode: '2200',
    payableAccountCode: '2000',
    currency: 'USD',
    reference: 'r1',
    description: 'Receipt: Acme Corp',
    createdByUserId: 'user1',
  };

  it('should generate balanced journal entry', () => {
    const entry = buildReceiptJournalEntry(base);
    const debits = entry.lines.filter((l) => l.type === 'DEBIT').reduce((s, l) => s + l.amountCents, 0n);
    const credits = entry.lines.filter((l) => l.type === 'CREDIT').reduce((s, l) => s + l.amountCents, 0n);
    expect(debits).toBe(credits);
  });

  it('should debit expense with net amount (total - tax)', () => {
    const entry = buildReceiptJournalEntry(base);
    const expenseLine = entry.lines.find((l) => l.accountCode === '5000' && l.type === 'DEBIT');
    expect(expenseLine?.amountCents).toBe(10000n); // $100.00
  });

  it('should debit tax account', () => {
    const entry = buildReceiptJournalEntry(base);
    const taxLine = entry.lines.find((l) => l.accountCode === '2200' && l.type === 'DEBIT');
    expect(taxLine?.amountCents).toBe(1000n);
  });

  it('should credit accounts payable with total', () => {
    const entry = buildReceiptJournalEntry(base);
    const apLine = entry.lines.find((l) => l.accountCode === '2000' && l.type === 'CREDIT');
    expect(apLine?.amountCents).toBe(11000n);
  });
});
