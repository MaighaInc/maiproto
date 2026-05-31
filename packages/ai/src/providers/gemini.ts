import { GoogleGenerativeAI, type GenerativeModel } from '@google/generative-ai';
import type {
  IAIProvider,
  AIExtractionOptions,
  ReceiptExtractionResult,
  CategorizationResult,
  SearchFilter,
  AIChatMessage,
} from '../types.js';
import { receiptExtractionSchema, categorizationSchema } from '../types.js';
import {
  RECEIPT_EXTRACTION_SYSTEM_PROMPT,
  CATEGORIZATION_SYSTEM_PROMPT,
  SEARCH_PARSE_SYSTEM_PROMPT,
} from '../prompts.js';
import { SystemError } from '@receiptflow/shared/errors';
import { z } from 'zod';

export interface GeminiConfig {
  apiKey: string;
  model: string;
}

export class GeminiProvider implements IAIProvider {
  readonly providerName = 'GEMINI';
  private readonly genAI: GoogleGenerativeAI;
  private readonly model: GenerativeModel;

  constructor(config: GeminiConfig) {
    this.genAI = new GoogleGenerativeAI(config.apiKey);
    this.model = this.genAI.getGenerativeModel({
      model: config.model,
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.1,
      },
    });
  }

  async extractReceiptData(options: AIExtractionOptions): Promise<ReceiptExtractionResult> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const parts: any[] = [
      `${RECEIPT_EXTRACTION_SYSTEM_PROMPT}\n\nExtract from this OCR text:\n${options.ocrText}`,
    ];

    if (options.imageBase64 && options.mimeType) {
      parts.push({
        inlineData: {
          data: options.imageBase64,
          mimeType: options.mimeType,
        },
      } as never);
    }

    const result = await this.model.generateContent(parts as string[]);
    const text = result.response.text();
    return parseAndValidate(text, receiptExtractionSchema);
  }

  async categorizeExpense(
    receiptData: ReceiptExtractionResult,
    availableCategories: string[],
  ): Promise<CategorizationResult> {
    const prompt = `${CATEGORIZATION_SYSTEM_PROMPT}\n\nReceipt data:\n${JSON.stringify(receiptData)}\n\nCategories:\n${availableCategories.join('\n')}`;
    const result = await this.model.generateContent(prompt);
    return parseAndValidate(result.response.text(), categorizationSchema);
  }

  async parseSearchQuery(query: string): Promise<SearchFilter> {
    const prompt = `${SEARCH_PARSE_SYSTEM_PROMPT}\n\nQuery: ${query}`;
    const result = await this.model.generateContent(prompt);
    return JSON.parse(result.response.text()) as SearchFilter;
  }

  async chat(messages: AIChatMessage[], systemPrompt?: string): Promise<string> {
    const chatSession = this.model.startChat({
      history: messages.slice(0, -1).map((m) => ({
        role: m.role === 'system' ? 'user' : m.role,
        parts: [{ text: m.content }],
      })),
      ...(systemPrompt
        ? {
            systemInstruction: { role: 'system', parts: [{ text: systemPrompt }] },
          }
        : {}),
    });

    const lastMessage = messages[messages.length - 1];
    if (!lastMessage) return '';
    const result = await chatSession.sendMessage(lastMessage.content);
    return result.response.text();
  }
}

function parseAndValidate<T>(text: string, schema: { parse: (data: unknown) => T }): T {
  try {
    return schema.parse(JSON.parse(text) as unknown);
  } catch (err) {
    throw new SystemError(`Gemini response validation failed: ${String(err)}`);
  }
}
