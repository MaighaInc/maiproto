import Anthropic from '@anthropic-ai/sdk';
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

export interface ClaudeConfig {
  apiKey: string;
  model: string;
}

export class ClaudeProvider implements IAIProvider {
  readonly providerName = 'CLAUDE';
  private readonly client: Anthropic;
  private readonly model: string;

  constructor(config: ClaudeConfig) {
    this.client = new Anthropic({ apiKey: config.apiKey });
    this.model = config.model;
  }

  async extractReceiptData(options: AIExtractionOptions): Promise<ReceiptExtractionResult> {
    const content: Anthropic.MessageParam['content'] = [
      {
        type: 'text',
        text: `Extract receipt data from the following OCR text. Return ONLY valid JSON.\n\n${options.ocrText}`,
      },
    ];

    if (options.imageBase64 && options.mimeType) {
      const supportedMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'] as const;
      type MediaType = (typeof supportedMimeTypes)[number];
      const mediaType = (
        supportedMimeTypes.includes(options.mimeType as MediaType)
          ? options.mimeType
          : 'image/jpeg'
      ) as MediaType;

      content.unshift({
        type: 'image',
        source: {
          type: 'base64',
          media_type: mediaType,
          data: options.imageBase64,
        },
      });
    }

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 2048,
      system: RECEIPT_EXTRACTION_SYSTEM_PROMPT,
      messages: [{ role: 'user', content }],
      temperature: options.temperature ?? 0.1,
    });

    const text = response.content[0];
    if (text?.type !== 'text') throw new SystemError('Claude returned non-text response');
    return parseAndValidate(text.text, receiptExtractionSchema);
  }

  async categorizeExpense(
    receiptData: ReceiptExtractionResult,
    availableCategories: string[],
  ): Promise<CategorizationResult> {
    const userContent = `Receipt data:\n${JSON.stringify(receiptData, null, 2)}\n\nAvailable categories:\n${availableCategories.join('\n')}\n\nReturn ONLY valid JSON.`;

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 512,
      system: CATEGORIZATION_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userContent }],
      temperature: 0.1,
    });

    const text = response.content[0];
    if (text?.type !== 'text') throw new SystemError('Claude returned non-text response');
    return parseAndValidate(text.text, categorizationSchema);
  }

  async parseSearchQuery(query: string): Promise<SearchFilter> {
    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 512,
      system: SEARCH_PARSE_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: `${query}\n\nReturn ONLY valid JSON.` }],
      temperature: 0.1,
    });

    const text = response.content[0];
    if (text?.type !== 'text') throw new SystemError('Claude returned non-text response');
    return JSON.parse(extractJson(text.text)) as SearchFilter;
  }

  async chat(messages: AIChatMessage[], systemPrompt?: string): Promise<string> {
    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 4096,
      ...(systemPrompt ? { system: systemPrompt } : {}),
      messages: messages.map((m) => ({
        role: m.role === 'system' ? 'user' : m.role,
        content: m.content,
      })),
    });

    const text = response.content[0];
    return text?.type === 'text' ? text.text : '';
  }
}

function parseAndValidate<T>(text: string, schema: { parse: (data: unknown) => T }): T {
  try {
    const json = extractJson(text);
    return schema.parse(JSON.parse(json) as unknown);
  } catch (err) {
    throw new SystemError(`Claude response validation failed: ${String(err)}`);
  }
}

function extractJson(text: string): string {
  // Claude sometimes wraps JSON in markdown code blocks
  const match = /```(?:json)?\s*([\s\S]*?)```/i.exec(text);
  return match?.[1]?.trim() ?? text.trim();
}
