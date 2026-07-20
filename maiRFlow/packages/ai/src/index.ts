import type { IAIProvider } from './types.js';
import { OpenAIProvider, type OpenAIConfig } from './providers/openai.js';
import { ClaudeProvider, type ClaudeConfig } from './providers/claude.js';
import { GeminiProvider, type GeminiConfig } from './providers/gemini.js';
import { MockAIProvider } from './providers/mock.js';

export type AIProviderType = 'openai' | 'claude' | 'gemini' | 'mock';

export interface AIFactoryConfig {
  provider: AIProviderType;
  openai?: OpenAIConfig;
  claude?: ClaudeConfig;
  gemini?: GeminiConfig;
}

export function createAIProvider(config: AIFactoryConfig): IAIProvider {
  switch (config.provider) {
    case 'openai': {
      if (!config.openai) throw new Error('OpenAI config required when provider is "openai"');
      return new OpenAIProvider(config.openai);
    }
    case 'claude': {
      if (!config.claude) throw new Error('Claude config required when provider is "claude"');
      return new ClaudeProvider(config.claude);
    }
    case 'gemini': {
      if (!config.gemini) throw new Error('Gemini config required when provider is "gemini"');
      return new GeminiProvider(config.gemini);
    }
    case 'mock':
      return new MockAIProvider();
    default:
      throw new Error(`Unknown AI provider: ${String(config.provider)}`);
  }
}

export type { IAIProvider } from './types.js';
export type { ReceiptExtractionResult, CategorizationResult, SearchFilter, LineItem } from './types.js';
export { OpenAIProvider } from './providers/openai.js';
export { ClaudeProvider } from './providers/claude.js';
export { GeminiProvider } from './providers/gemini.js';
export { MockAIProvider } from './providers/mock.js';
