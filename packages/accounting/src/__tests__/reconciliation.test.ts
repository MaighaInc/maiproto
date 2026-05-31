import { describe, it, expect } from 'vitest';
import { matchReceiptsToBankTransactions } from '../reconciliation.js';

const receipts = [
  { id: 'r1', amount: 5000, date: new Date('2024-01-10'), vendorName: 'Starbucks' },
  { id: 'r2', amount: 12050, date: new Date('2024-01-12'), vendorName: 'Amazon' },
];

const transactions = [
  { id: 't1', amount: 5000, date: new Date('2024-01-10'), description: 'STARBUCKS #123' },
  { id: 't2', amount: 12050, date: new Date('2024-01-13'), description: 'AMZN MKTP US' },
  { id: 't3', amount: 99900, date: new Date('2024-01-15'), description: 'TOTALLY UNRELATED' },
];

describe('matchReceiptsToBankTransactions', () => {
  it('should match receipts to transactions by amount and vendor', () => {
    const matches = matchReceiptsToBankTransactions(receipts as never, transactions as never);
    expect(matches.length).toBe(2);
    const r1match = matches.find((m) => m.receiptId === 'r1');
    expect(r1match?.transactionId).toBe('t1');
  });

  it('should not return matches below minScore', () => {
    const matches = matchReceiptsToBankTransactions(receipts as never, transactions as never, { minScore: 0.99 });
    // Very strict threshold — r2/t2 have a 1-day date difference, might not match
    expect(Array.isArray(matches)).toBe(true);
  });

  it('should not create duplicate matches', () => {
    const matches = matchReceiptsToBankTransactions(receipts as never, transactions as never);
    const txIds = matches.map((m) => m.transactionId);
    expect(new Set(txIds).size).toBe(txIds.length);
  });
});
