import {
  DocumentProcessorServiceClient,
  protos,
} from '@google-cloud/documentai';
import type { IOCRProvider, OCRResult, OCRPage, OCRBlock, OCROptions } from '../types.js';
import { SystemError } from '@receiptflow/shared/errors';

export interface DocumentAIConfig {
  projectId: string;
  location: string;
  processorId: string;
  credentialsPath?: string;
}

type IDocument = protos.google.cloud.documentai.v1.IDocument;

export class DocumentAIProvider implements IOCRProvider {
  readonly providerName = 'DOCUMENT_AI';
  private readonly client: DocumentProcessorServiceClient;
  private readonly processorName: string;

  constructor(config: DocumentAIConfig) {
    this.client = new DocumentProcessorServiceClient(
      config.credentialsPath ? { keyFilename: config.credentialsPath } : undefined,
    );
    this.processorName = `projects/${config.projectId}/locations/${config.location}/processors/${config.processorId}`;
  }

  async processDocument(data: Buffer, mimeType: string, _options: OCROptions = {}): Promise<OCRResult> {
    const start = Date.now();

    try {
      const [result] = await this.client.processDocument({
        name: this.processorName,
        rawDocument: {
          content: data.toString('base64'),
          mimeType,
        },
      });

      const document = result.document;
      if (!document) throw new SystemError('Document AI returned empty document');

      return parseDocumentAIResult(document, Date.now() - start);
    } catch (err) {
      throw new SystemError(`Document AI OCR failed: ${String(err)}`);
    }
  }
}

function parseDocumentAIResult(doc: IDocument, durationMs: number): OCRResult {
  const fullText = doc.text ?? '';
  const pages: OCRPage[] = [];

  for (const page of doc.pages ?? []) {
    const pageBlocks: OCRBlock[] = [];
    const pageLines: string[] = [];

    for (const para of page.paragraphs ?? []) {
      const text = extractText(fullText, para.layout?.textAnchor);
      const confidence = para.layout?.confidence ?? 0;
      if (text) {
        pageLines.push(text);
        pageBlocks.push({
          text,
          confidence,
          blockType: 'PARAGRAPH',
          boundingBox: extractBoundingBox(para.layout),
        });
      }
    }

    pages.push({
      pageNumber: (page.pageNumber ?? 1),
      width: page.dimension?.width ?? 0,
      height: page.dimension?.height ?? 0,
      blocks: pageBlocks,
      rawText: pageLines.join('\n'),
    });
  }

  const allConfidences = pages.flatMap((p) => p.blocks.map((b) => b.confidence));
  const avgConfidence =
    allConfidences.length > 0
      ? allConfidences.reduce((a, b) => a + b, 0) / allConfidences.length
      : 0;

  return {
    pages,
    fullText,
    confidence: avgConfidence,
    providerMetadata: { mimeType: doc.mimeType },
    durationMs,
  };
}

function extractText(
  fullText: string,
  anchor: protos.google.cloud.documentai.v1.Document.ITextAnchor | null | undefined,
): string {
  if (!anchor?.textSegments?.length) return '';
  return anchor.textSegments
    .map((seg) => fullText.slice(Number(seg.startIndex ?? 0), Number(seg.endIndex ?? 0)))
    .join('');
}

function extractBoundingBox(
  layout: protos.google.cloud.documentai.v1.Document.Page.ILayout | null | undefined,
): OCRBlock['boundingBox'] | undefined {
  const vertices = layout?.boundingPoly?.normalizedVertices;
  if (!vertices?.length) return undefined;
  const xs = vertices.map((v) => v.x ?? 0);
  const ys = vertices.map((v) => v.y ?? 0);
  const left = Math.min(...xs);
  const top = Math.min(...ys);
  return {
    left,
    top,
    width: Math.max(...xs) - left,
    height: Math.max(...ys) - top,
  };
}
