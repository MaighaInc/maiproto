import type { IOCRProvider, OCRResult, OCROptions } from '../types.js';

/**
 * Mock OCR provider for local development.
 * Returns deterministic dummy data — no cloud credentials required.
 */
export class MockOCRProvider implements IOCRProvider {
  readonly providerName = 'MOCK';

  async processDocument(_data: Buffer, _mimeType: string, _options: OCROptions = {}): Promise<OCRResult> {
    const mockText = [
      'ACME STORE',
      '123 Main Street, Springfield, IL 62701',
      'Tel: (555) 123-4567',
      '',
      'Date: 12/25/2024  Time: 14:32',
      '',
      'Coffee               $4.50',
      'Sandwich             $8.75',
      'Chips                $2.00',
      '',
      'Subtotal:           $15.25',
      'Tax (8%):            $1.22',
      'Total:              $16.47',
      '',
      'VISA •••• 4242',
      'APPROVED',
    ].join('\n');

    return {
      pages: [
        {
          pageNumber: 1,
          width: 400,
          height: 600,
          rawText: mockText,
          blocks: mockText.split('\n').map((line, i) => ({
            text: line,
            confidence: 0.99,
            blockType: 'LINE' as const,
            boundingBox: { top: i * 20, left: 0, width: 400, height: 18 },
          })),
        },
      ],
      fullText: mockText,
      confidence: 0.99,
      providerMetadata: { mock: true },
      durationMs: 10,
    };
  }
}
