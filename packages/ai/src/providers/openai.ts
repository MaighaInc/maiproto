import OpenAI from 'openai';
import { z } from 'zod';
import type {
  IAIProvider,
  AIExtractionOptions,
  ReceiptExtractionResult,
  CategorizationResult,
  SearchFilter,
  AIChatMessage,
} from '../types.js';
import {
  receiptExtractionSchema,
  categorizationSchema,
} from '../types.js';
import {
  RECEIPT_EXTRACTION_SYSTEM_PROMPT,
  CATEGORIZATION_SYSTEM_PROMPT,
  SEARCH_PARSE_SYSTEM_PROMPT,
} from '../prompts.js';
import { SystemError } from '@receiptflow/shared/errors';

export interface OpenAIConfig {
  apiKey: string;
  model: string;
  embeddingModel?: string;
}

export class OpenAIProvider implements IAIProvider {
  readonly providerName = 'OPENAI';
  private readonly client: OpenAI;
  private readonly model: string;

  constructor(config: OpenAIConfig) {
    this.client = new OpenAI({ apiKey: config.apiKey });
    this.model = config.model;
  }

  async extractReceiptData(options: AIExtractionOptions): Promise<ReceiptExtractionResult> {
    const userContent: OpenAI.ChatCompletionContentPart[] = [
      {
        type: 'text',
        text: `Extract receipt data from the following OCR text:\n\n${options.ocrText}`,
      },
    ];

    if (options.imageBase64 && options.mimeType) {
      userContent.push({
        type: 'image_url',
        image_url: {
          url: `data:${options.mimeType};base64,${options.imageBase64}`,
          detail: 'high',
        },
      });
    }

    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: [
        { role: 'system', content: RECEIPT_EXTRACTION_SYSTEM_PROMPT },
        { role: 'user', content: userContent },
      ],
      response_format: { type: 'json_object' },
      temperature: options.temperature ?? 0.1,
    });

    const content = response.choices[0]?.message.content;
    if (!content) throw new SystemError('OpenAI returned empty response');

    return parseAndValidate(content, receiptExtractionSchema);
  }

  async categorizeExpense(
    receiptData: ReceiptExtractionResult,
    availableCategories: string[],
  ): Promise<CategorizationResult> {
    const userContent = `Receipt data:\n${JSON.stringify(receiptData, null, 2)}\n\nAvailable categories:\n${availableCategories.join('\n')}`;

    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: [
        { role: 'system', content: CATEGORIZATION_SYSTEM_PROMPT },
        { role: 'user', content: userContent },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1,
    });

    const content = response.choices[0]?.message.content;
    if (!content) throw new SystemError('OpenAI returned empty categorization response');
    return parseAndValidate(content, categorizationSchema);
  }

  async parseSearchQuery(query: string): Promise<SearchFilter> {
    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: [
        { role: 'system', content: SEARCH_PARSE_SYSTEM_PROMPT },
        { role: 'user', content: query },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1,
    });

    const content = response.choices[0]?.message.content;
    if (!content) throw new SystemError('OpenAI returned empty search response');
    return JSON.parse(content) as SearchFilter;
  }

  async chat(messages: AIChatMessage[], systemPrompt?: string): Promise<string> {
    const openaiMessages: OpenAI.ChatCompletionMessageParam[] = [
      ...(systemPrompt ? [{ role: 'system' as const, content: systemPrompt }] : []),
      ...messages.map((m) => ({ role: m.role, content: m.content })),
    ];

    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: openaiMessages,
    });

    return response.choices[0]?.message.content ?? '';
  }

  async createEmbedding(text: string): Promise<number[]> {
    const response = await this.client.embeddings.create({
      model: 'text-embedding-3-small',
      input: text,
    });
    return response.data[0]?.embedding ?? [];
  }
}

function parseAndValidate<T>(json: string, schema: { parse: (data: unknown) => T }): T {
  try {
    const parsed = JSON.parse(json) as unknown;
    return schema.parse(parsed);
  } catch (err) {
    throw new SystemError(`AI response validation failed: ${String(err)}`);
  }
}
