import {
  DocumentAnalysisClient,
  AzureKeyCredential,
} from '@azure/ai-form-recognizer';
import type { IOCRProvider, OCRResult, OCRPage, OCRBlock, OCROptions } from '../types.js';
import { SystemError } from '@receiptflow/shared/errors';

export interface FormRecognizerConfig {
  endpoint: string;
  apiKey: string;
}

export class FormRecognizerProvider implements IOCRProvider {
  readonly providerName = 'FORM_RECOGNIZER';
  private readonly client: DocumentAnalysisClient;

  constructor(config: FormRecognizerConfig) {
    this.client = new DocumentAnalysisClient(
      config.endpoint,
      new AzureKeyCredential(config.apiKey),
    );
  }

  async processDocument(data: Buffer, mimeType: string, _options: OCROptions = {}): Promise<OCRResult> {
    const start = Date.now();

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const client = this.client as any;
      const poller = await (client.beginAnalyzeDocument('prebuilt-receipt', data, {
        contentType: mimeType,
      }) as Promise<{ pollUntilDone: () => Promise<unknown> }>);

      const result = await poller.pollUntilDone();
      const durationMs = Date.now() - start;

      return parseFormRecognizerResult(result, durationMs);
    } catch (err) {
      throw new SystemError(`Azure Form Recognizer OCR failed: ${String(err)}`);
    }
  }
}

function parseFormRecognizerResult(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  result: any,
  durationMs: number,
): OCRResult {
  const pages: OCRPage[] = [];
  const allLines: string[] = [];

  for (const page of result.pages ?? []) {
    const blocks: OCRBlock[] = [];
    const pageLines: string[] = [];

    for (const line of page.lines ?? []) {
      const text = line.content;
      if (!text) continue;
      pageLines.push(text);
      allLines.push(text);
      blocks.push({
        text,
        confidence: 1.0, // Form Recognizer does not expose per-line confidence in this API
        blockType: 'LINE',
        boundingBox:
          line.polygon && line.polygon.length >= 4
            ? {
                left: Math.min(...line.polygon.map((p) => p.x)),
                top: Math.min(...line.polygon.map((p) => p.y)),
                width:
                  Math.max(...line.polygon.map((p) => p.x)) -
                  Math.min(...line.polygon.map((p) => p.x)),
                height:
                  Math.max(...line.polygon.map((p) => p.y)) -
                  Math.min(...line.polygon.map((p) => p.y)),
              }
            : undefined,
      });
    }

    pages.push({
      pageNumber: page.pageNumber,
      width: page.width ?? 0,
      height: page.height ?? 0,
      blocks,
      rawText: pageLines.join('\n'),
    });
  }

  // Extract confidence from documents if available
  const confidences = (result.documents ?? []).flatMap((doc) =>
    Object.values(doc.fields ?? {}).map((f) => (f as { confidence?: number }).confidence ?? 0),
  );
  const avgConfidence =
    confidences.length > 0 ? confidences.reduce((a, b) => a + b, 0) / confidences.length : 0.8;

  return {
    pages,
    fullText: allLines.join('\n'),
    confidence: avgConfidence,
    providerMetadata: { modelId: result.modelId },
    durationMs,
  };
}
