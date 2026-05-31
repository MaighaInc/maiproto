export interface OCRBlock {
  text: string;
  confidence: number;
  boundingBox?: {
    top: number;
    left: number;
    width: number;
    height: number;
  };
  blockType: 'WORD' | 'LINE' | 'PARAGRAPH' | 'PAGE' | 'TABLE' | 'CELL' | 'KEY_VALUE';
  rowIndex?: number;
  columnIndex?: number;
}

export interface OCRPage {
  pageNumber: number;
  width: number;
  height: number;
  blocks: OCRBlock[];
  rawText: string;
}

export interface OCRResult {
  pages: OCRPage[];
  fullText: string;
  confidence: number;           // overall confidence 0–1
  providerMetadata: Record<string, unknown>;
  durationMs: number;
}

export interface OCROptions {
  detectTables?: boolean;
  detectForms?: boolean;
  language?: string;
}

export interface IOCRProvider {
  readonly providerName: string;

  /**
   * Process a document (PDF or image) from a Buffer.
   */
  processDocument(data: Buffer, mimeType: string, options?: OCROptions): Promise<OCRResult>;

  /**
   * Process a document stored at a URL / storage key.
   * Implementations may use native S3 integration (Textract) or download first.
   */
  processDocumentFromUrl?(url: string, mimeType: string, options?: OCROptions): Promise<OCRResult>;
}
