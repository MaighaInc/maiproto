import type { IAIProvider, ReceiptExtractionResult, CategorizationResult, SearchFilter } from '../types.js';
import type { AIExtractionOptions } from '../types.js';

/**
 * Mock AI provider for local development.
 * Parses the mock OCR text deterministically — no LLM calls needed.
 */
export class MockAIProvider implements IAIProvider {
  readonly providerName = 'MOCK';

  async extractReceiptData(_options: AIExtractionOptions): Promise<ReceiptExtractionResult> {
    return {
      merchantName: 'ACME Store',
      merchantAddress: '123 Main Street, Springfield, IL 62701',
      merchantPhone: '(555) 123-4567',
      transactionDate: '2024-12-25',
      transactionTime: '14:32',
      subtotal: 15.25,
      tax: 1.22,
      tip: null,
      total: 16.47,
      currency: 'USD',
      paymentMethod: 'CREDIT_CARD',
      last4Digits: '4242',
      lineItems: [
        { description: 'Coffee', quantity: 1, unitPrice: 4.50, amount: 4.50 },
        { description: 'Sandwich', quantity: 1, unitPrice: 8.75, amount: 8.75 },
        { description: 'Chips', quantity: 1, unitPrice: 2.00, amount: 2.00 },
      ],
      confidence: 0.99,
      notes: null,
    };
  }

  async categorizeExpense(
    _receiptData: ReceiptExtractionResult,
    availableCategories: string[],
  ): Promise<CategorizationResult> {
    return {
      category: availableCategories[0] ?? 'Meals & Entertainment',
      confidence: 0.9,
      reasoning: 'Mock categorization',
      isTaxDeductible: true,
    };
  }

  async parseSearchQuery(_query: string): Promise<SearchFilter> {
    return {};
  }

  async chat(_messages: import('../types.js').AIChatMessage[], _systemPrompt?: string): Promise<string> {
    return 'Mock AI response';
  }
}
