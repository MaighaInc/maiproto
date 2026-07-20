import { z } from 'zod';

// ─── Extraction result ────────────────────────────────────────────────────────

export const lineItemSchema = z.object({
  description: z.string(),
  quantity: z.number().optional(),
  unitPrice: z.number().optional(),
  amount: z.number(),
  taxable: z.boolean().optional(),
});

export const receiptExtractionSchema = z.object({
  merchantName: z.string().nullable(),
  merchantAddress: z.string().nullable(),
  merchantPhone: z.string().nullable(),
  transactionDate: z.string().nullable(),  // ISO date string
  transactionTime: z.string().nullable(),  // HH:mm
  subtotal: z.number().nullable(),
  tax: z.number().nullable(),
  tip: z.number().nullable(),
  total: z.number().nullable(),
  currency: z.string().length(3).nullable(),
  paymentMethod: z
    .enum(['CREDIT_CARD', 'DEBIT_CARD', 'CASH', 'CHECK', 'ACH', 'WIRE', 'CRYPTO', 'OTHER'])
    .nullable(),
  last4Digits: z.string().nullable(),
  lineItems: z.array(lineItemSchema).optional(),
  confidence: z.number().min(0).max(1).default(0),
  notes: z.string().nullable().optional(),
});

export type ReceiptExtractionResult = z.infer<typeof receiptExtractionSchema>;
export type LineItem = z.infer<typeof lineItemSchema>;

// ─── Categorization result ───────────────────────────────────────────────────

export const categorizationSchema = z.object({
  category: z.string(),
  confidence: z.number().min(0).max(1),
  reasoning: z.string().optional(),
  isTaxDeductible: z.boolean(),
});

export type CategorizationResult = z.infer<typeof categorizationSchema>;

// ─── Search result ────────────────────────────────────────────────────────────

export interface SearchFilter {
  merchantName?: string;
  minAmount?: number;
  maxAmount?: number;
  from?: Date;
  to?: Date;
  categories?: string[];
  keywords?: string[];
}

// ─── Provider interface ──────────────────────────────────────────────────────

export interface AIExtractionOptions {
  ocrText: string;
  imageBase64?: string;
  mimeType?: string;
  temperature?: number;
  maxRetries?: number;
}

export interface AIChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface IAIProvider {
  readonly providerName: string;

  extractReceiptData(options: AIExtractionOptions): Promise<ReceiptExtractionResult>;
  categorizeExpense(
    receiptData: ReceiptExtractionResult,
    availableCategories: string[],
  ): Promise<CategorizationResult>;
  parseSearchQuery(naturalLanguageQuery: string): Promise<SearchFilter>;
  chat(messages: AIChatMessage[], systemPrompt?: string): Promise<string>;
}
