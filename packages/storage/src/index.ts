import type { IStorageProvider } from './provider.interface.js';
import { S3StorageProvider, createR2Provider, type S3Config, type R2Config } from './providers/s3.js';
import { LocalStorageProvider, type LocalStorageConfig } from './providers/local.js';
import { randomBytes } from 'node:crypto';
import { join } from 'node:path';

export type StorageProviderType = 'local' | 's3' | 'r2';

export interface StorageFactoryConfig {
  provider: StorageProviderType;
  s3?: S3Config;
  r2?: R2Config;
  local?: LocalStorageConfig;
}

export function createStorageProvider(config: StorageFactoryConfig): IStorageProvider {
  switch (config.provider) {
    case 's3': {
      if (!config.s3) throw new Error('S3 config required when provider is "s3"');
      return new S3StorageProvider(config.s3);
    }
    case 'r2': {
      if (!config.r2) throw new Error('R2 config required when provider is "r2"');
      return createR2Provider(config.r2);
    }
    case 'local': {
      if (!config.local) throw new Error('Local config required when provider is "local"');
      return new LocalStorageProvider(config.local);
    }
    default:
      throw new Error(`Unknown storage provider: ${String(config.provider)}`);
  }
}

// ─── Key generation helpers ──────────────────────────────────────────────────

/**
 * Generate a storage key for a receipt file.
 * Format: receipts/{tenantId}/{orgId}/{receiptId}/{filename}
 */
export function receiptFileKey(
  tenantId: string,
  orgId: string,
  receiptId: string,
  originalName: string,
): string {
  const ext = originalName.split('.').pop() ?? 'bin';
  const uniquePart = randomBytes(8).toString('hex');
  return `receipts/${tenantId}/${orgId}/${receiptId}/${uniquePart}.${ext}`;
}

/**
 * Generate a key for an extracted page image.
 */
export function pageImageKey(
  tenantId: string,
  orgId: string,
  receiptId: string,
  pageNumber: number,
): string {
  return `receipts/${tenantId}/${orgId}/${receiptId}/pages/page_${pageNumber}.jpg`;
}

export type { IStorageProvider, StorageObject, UploadOptions, PresignedUrlOptions } from './provider.interface.js';
export { S3StorageProvider } from './providers/s3.js';
export { LocalStorageProvider } from './providers/local.js';
