import type { Readable } from 'node:stream';

export interface StorageObject {
  key: string;
  size: number;
  contentType: string;
  etag?: string;
  lastModified?: Date;
  metadata?: Record<string, string>;
}

export interface UploadOptions {
  contentType: string;
  contentDisposition?: string;
  metadata?: Record<string, string>;
  serverSideEncryption?: boolean;
  cacheControl?: string;
}

export interface PresignedUrlOptions {
  expiresIn?: number;  // seconds, default 3600
  contentType?: string;
  contentLength?: number;
}

/**
 * Provider-agnostic storage interface.
 * All implementations MUST satisfy this contract.
 */
export interface IStorageProvider {
  readonly providerName: string;

  /**
   * Upload a file to storage.
   * @returns the storage key
   */
  upload(key: string, data: Buffer | Readable, options: UploadOptions): Promise<StorageObject>;

  /**
   * Download a file from storage.
   */
  download(key: string): Promise<Buffer>;

  /**
   * Stream a file from storage.
   */
  stream(key: string): Promise<Readable>;

  /**
   * Delete a file from storage.
   */
  delete(key: string): Promise<void>;

  /**
   * Delete multiple files.
   */
  deleteMany(keys: string[]): Promise<void>;

  /**
   * Check if a file exists.
   */
  exists(key: string): Promise<boolean>;

  /**
   * Get file metadata without downloading.
   */
  stat(key: string): Promise<StorageObject>;

  /**
   * Generate a pre-signed URL for direct client download.
   */
  presignDownload(key: string, options?: PresignedUrlOptions): Promise<string>;

  /**
   * Generate a pre-signed URL for direct client upload.
   */
  presignUpload(key: string, options: PresignedUrlOptions): Promise<string>;

  /**
   * Copy a file within the same provider.
   */
  copy(sourceKey: string, destinationKey: string): Promise<StorageObject>;
}
