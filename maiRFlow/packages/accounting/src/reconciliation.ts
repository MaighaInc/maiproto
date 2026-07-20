import { amountSimilarity, dateSimilarity, stringSimilarity } from '@receiptflow/shared/utils';

export interface ReceiptCandidate {
  id: string;
  amount: number;          // in cents
  transactionDate: Date;
  vendorName: string | null;
}

export interface BankTransactionCandidate {
  id: string;
  amount: number;          // in cents (positive = debit)
  date: Date;
  description: string;
}

export interface MatchResult {
  receiptId: string;
  bankTransactionId: string;
  score: number;           // 0–1
  method: 'EXACT' | 'FUZZY';
}

export interface MatchConfig {
  minScore: number;        // default 0.7
  amountWeight: number;    // default 0.5
  dateWeight: number;      // default 0.3
  vendorWeight: number;    // default 0.2
  dateTolerance?: number;  // tolerance in days (default 3)
}

const DEFAULT_CONFIG: MatchConfig = {
  minScore: 0.7,
  amountWeight: 0.5,
  dateWeight: 0.3,
  vendorWeight: 0.2,
  dateTolerance: 3,
};

/**
 * Match receipts to bank transactions using a weighted scoring algorithm.
 * Returns the best match (score >= minScore) for each bank transaction.
 * Each receipt/transaction is only matched once (greedy, highest-score-first).
 */
export function matchReceiptsToBankTransactions(
  receipts: ReceiptCandidate[],
  transactions: BankTransactionCandidate[],
  config: Partial<MatchConfig> = {},
): MatchResult[] {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const candidates: Array<MatchResult & { _score: number }> = [];

  for (const txn of transactions) {
    for (const receipt of receipts) {
      const score = computeScore(receipt, txn, cfg);
      if (score >= cfg.minScore) {
        candidates.push({
          receiptId: receipt.id,
          bankTransactionId: txn.id,
          score,
          method: score === 1.0 ? 'EXACT' : 'FUZZY',
          _score: score,
        });
      }
    }
  }

  // Sort by score descending; greedy one-to-one matching
  candidates.sort((a, b) => b._score - a._score);
  const matchedReceipts = new Set<string>();
  const matchedTransactions = new Set<string>();
  const results: MatchResult[] = [];

  for (const c of candidates) {
    if (matchedReceipts.has(c.receiptId) || matchedTransactions.has(c.bankTransactionId)) {
      continue;
    }
    matchedReceipts.add(c.receiptId);
    matchedTransactions.add(c.bankTransactionId);
    results.push({ receiptId: c.receiptId, bankTransactionId: c.bankTransactionId, score: c.score, method: c.method });
  }

  return results;
}

function computeScore(
  receipt: ReceiptCandidate,
  txn: BankTransactionCandidate,
  cfg: MatchConfig,
): number {
  const amtScore = amountSimilarity(receipt.amount, txn.amount, 0.02);
  const dateScore = dateSimilarity(receipt.transactionDate, txn.date, cfg.dateTolerance ?? 3);
  const vendorScore = receipt.vendorName
    ? stringSimilarity(receipt.vendorName, txn.description)
    : 0.5; // neutral when vendor unknown

  return (
    cfg.amountWeight * amtScore +
    cfg.dateWeight * dateScore +
    cfg.vendorWeight * vendorScore
  );
}
