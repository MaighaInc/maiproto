import type { PaginationMeta, PaginatedResult } from '../types/api.js';

// ─── Pagination ──────────────────────────────────────────────────────────────

export function buildPaginationMeta(
  total: number,
  page: number,
  perPage: number,
): PaginationMeta {
  const totalPages = Math.ceil(total / perPage);
  return {
    total,
    page,
    perPage,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  };
}

export function paginate<T>(
  items: T[],
  total: number,
  page: number,
  perPage: number,
): PaginatedResult<T> {
  return {
    items,
    meta: buildPaginationMeta(total, page, perPage),
  };
}

export function getPaginationOffset(page: number, perPage: number): { skip: number; take: number } {
  return {
    skip: (page - 1) * perPage,
    take: perPage,
  };
}

// ─── String utils ────────────────────────────────────────────────────────────

export function normalizeString(value: string): string {
  return value.toLowerCase().trim().replace(/\s+/g, ' ');
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function maskString(value: string, visibleChars = 4): string {
  if (value.length <= visibleChars) return value;
  return '*'.repeat(value.length - visibleChars) + value.slice(-visibleChars);
}

// ─── Number utils ────────────────────────────────────────────────────────────

export function toCents(amount: number): number {
  return Math.round(amount * 100);
}

export function fromCents(cents: number): number {
  return cents / 100;
}

export function roundMoney(amount: number, decimals = 2): number {
  const factor = Math.pow(10, decimals);
  return Math.round(amount * factor) / factor;
}

// ─── Date utils ──────────────────────────────────────────────────────────────

export function toISODateString(date: Date): string {
  return date.toISOString().split('T')[0] as string;
}

export function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function endOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

// ─── Object utils ────────────────────────────────────────────────────────────

export function omit<T extends object, K extends keyof T>(
  obj: T,
  keys: K[],
): Omit<T, K> {
  const result = { ...obj };
  for (const key of keys) {
    delete result[key];
  }
  return result as Omit<T, K>;
}

export function pick<T extends object, K extends keyof T>(
  obj: T,
  keys: K[],
): Pick<T, K> {
  const result = {} as Pick<T, K>;
  for (const key of keys) {
    if (key in obj) {
      result[key] = obj[key];
    }
  }
  return result;
}

// ─── Amount similarity (for reconciliation) ──────────────────────────────────

/**
 * Returns a similarity score 0–1 between two monetary amounts.
 * Exact match = 1.0, within 1% = ~0.99, etc.
 */
export function amountSimilarity(a: number, b: number, tolerance = 0): number {
  if (a === b) return 1;
  if (a === 0 && b === 0) return 1;
  const larger = Math.max(Math.abs(a), Math.abs(b));
  const diff = Math.abs(a - b);
  if (tolerance > 0 && diff / larger <= tolerance) return 1;
  return Math.max(0, 1 - diff / larger);
}

/**
 * Returns a date similarity score 0–1.
 * Same day = 1.0; toleranceDays controls the decay window (default 7).
 */
export function dateSimilarity(a: Date, b: Date, toleranceDays = 7): number {
  const diffMs = Math.abs(a.getTime() - b.getTime());
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  if (diffDays >= toleranceDays) return 0;
  return Math.max(0, 1 - diffDays / toleranceDays);
}

/**
 * Levenshtein-based string similarity score 0–1.
 */
export function stringSimilarity(a: string, b: string): number {
  const s1 = normalizeString(a);
  const s2 = normalizeString(b);
  if (s1 === s2) return 1;
  if (s1.length === 0 || s2.length === 0) return 0;
  const maxLen = Math.max(s1.length, s2.length);
  const distance = levenshtein(s1, s2);
  return 1 - distance / maxLen;
}

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)),
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i]![j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1]![j - 1]!
          : 1 + Math.min(dp[i - 1]![j]!, dp[i]![j - 1]!, dp[i - 1]![j - 1]!);
    }
  }
  return dp[m]![n]!;
}
