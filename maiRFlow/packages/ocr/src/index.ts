import type { IOCRProvider } from './types.js';
import { TextractProvider, type TextractConfig } from './providers/textract.js';
import { DocumentAIProvider, type DocumentAIConfig } from './providers/document-ai.js';
import { FormRecognizerProvider, type FormRecognizerConfig } from './providers/form-recognizer.js';
import { MockOCRProvider } from './providers/mock.js';

export type OCRProviderType = 'textract' | 'documentai' | 'formrecognizer' | 'mock';

export interface OCRFactoryConfig {
  provider: OCRProviderType;
  textract?: TextractConfig;
  documentAI?: DocumentAIConfig;
  formRecognizer?: FormRecognizerConfig;
}

export function createOCRProvider(config: OCRFactoryConfig): IOCRProvider {
  switch (config.provider) {
    case 'textract': {
      if (!config.textract) throw new Error('Textract config required');
      return new TextractProvider(config.textract);
    }
    case 'documentai': {
      if (!config.documentAI) throw new Error('Document AI config required');
      return new DocumentAIProvider(config.documentAI);
    }
    case 'formrecognizer': {
      if (!config.formRecognizer) throw new Error('Form Recognizer config required');
      return new FormRecognizerProvider(config.formRecognizer);
    }
    case 'mock':
      return new MockOCRProvider();
    default:
      throw new Error(`Unknown OCR provider: ${String(config.provider)}`);
  }
}

export type { IOCRProvider, OCRResult, OCRPage, OCRBlock, OCROptions } from './types.js';
export { TextractProvider } from './providers/textract.js';
export { DocumentAIProvider } from './providers/document-ai.js';
export { FormRecognizerProvider } from './providers/form-recognizer.js';
export { MockOCRProvider } from './providers/mock.js';
