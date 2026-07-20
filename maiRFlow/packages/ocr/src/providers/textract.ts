import {
  TextractClient,
  AnalyzeDocumentCommand,
  type Block,
  type AnalyzeDocumentCommandInput,
} from '@aws-sdk/client-textract';
import type { IOCRProvider, OCRResult, OCRPage, OCRBlock, OCROptions } from '../types.js';
import { SystemError } from '@receiptflow/shared/errors';

export interface TextractConfig {
  region: string;
  accessKeyId?: string;
  secretAccessKey?: string;
}

export class TextractProvider implements IOCRProvider {
  readonly providerName = 'TEXTRACT';
  private readonly client: TextractClient;

  constructor(config: TextractConfig) {
    this.client = new TextractClient({
      region: config.region,
      ...(config.accessKeyId && config.secretAccessKey
        ? {
            credentials: {
              accessKeyId: config.accessKeyId,
              secretAccessKey: config.secretAccessKey,
            },
          }
        : {}),
    });
  }

  async processDocument(data: Buffer, mimeType: string, options: OCROptions = {}): Promise<OCRResult> {
    const start = Date.now();
    const featureTypes: AnalyzeDocumentCommandInput['FeatureTypes'] = [];
    if (options.detectTables) featureTypes.push('TABLES');
    if (options.detectForms) featureTypes.push('FORMS');

    const params: AnalyzeDocumentCommandInput = {
      Document: { Bytes: data },
      FeatureTypes: featureTypes.length > 0 ? featureTypes : ['TABLES', 'FORMS'],
    };

    try {
      const response = await this.client.send(new AnalyzeDocumentCommand(params));
      const blocks = response.Blocks ?? [];
      const durationMs = Date.now() - start;

      return parseTextractBlocks(blocks, durationMs, response);
    } catch (err) {
      throw new SystemError(`Textract OCR failed: ${String(err)}`);
    }
  }
}

function parseTextractBlocks(
  blocks: Block[],
  durationMs: number,
  rawResponse: unknown,
): OCRResult {
  const pageMap = new Map<number, OCRBlock[]>();
  const lines: string[] = [];
  let totalConfidence = 0;
  let confidenceCount = 0;

  for (const block of blocks) {
    const pageNum = block.Page ?? 1;
    if (!pageMap.has(pageNum)) pageMap.set(pageNum, []);

    if (block.BlockType === 'LINE' && block.Text) {
      lines.push(block.Text);
      const conf = block.Confidence ?? 0;
      totalConfidence += conf;
      confidenceCount++;

      const geo = block.Geometry?.BoundingBox;
      pageMap.get(pageNum)!.push({
        text: block.Text,
        confidence: conf / 100,
        blockType: 'LINE',
        boundingBox: geo
          ? {
              top: geo.Top ?? 0,
              left: geo.Left ?? 0,
              width: geo.Width ?? 0,
              height: geo.Height ?? 0,
            }
          : undefined,
      });
    }
  }

  const pages: OCRPage[] = Array.from(pageMap.entries()).map(([pageNumber, pageBlocks]) => ({
    pageNumber,
    width: 0,
    height: 0,
    blocks: pageBlocks,
    rawText: pageBlocks.map((b) => b.text).join('\n'),
  }));

  return {
    pages,
    fullText: lines.join('\n'),
    confidence: confidenceCount > 0 ? totalConfidence / confidenceCount / 100 : 0,
    providerMetadata: { raw: rawResponse },
    durationMs,
  };
}
