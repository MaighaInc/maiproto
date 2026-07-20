import { mkdir, writeFile, readFile, unlink, stat, copyFile, access } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { join, dirname } from 'node:path';
import { constants } from 'node:fs';
import type { Readable } from 'node:stream';
import type {
  IStorageProvider,
  StorageObject,
  UploadOptions,
  PresignedUrlOptions,
} from '../provider.interface.js';
import { NotFoundError } from '@receiptflow/shared/errors';

export interface LocalStorageConfig {
  basePath: string;
  baseUrl: string;   // URL prefix for generating "presigned" local URLs
}

/**
 * Local filesystem storage adapter.
 * Suitable for development and self-hosted deployments.
 * In production, use S3 or R2.
 */
export class LocalStorageProvider implements IStorageProvider {
  readonly providerName = 'LOCAL';
  private readonly basePath: string;
  private readonly baseUrl: string;

  constructor(config: LocalStorageConfig) {
    this.basePath = config.basePath;
    this.baseUrl = config.baseUrl.replace(/\/$/, '');
  }

  private resolvePath(key: string): string {
    // Prevent path traversal
    const normalized = key.replace(/\.\./g, '').replace(/^\/+/, '');
    return join(this.basePath, normalized);
  }

  async upload(key: string, data: Buffer | Readable, options: UploadOptions): Promise<StorageObject> {
    const filePath = this.resolvePath(key);
    await mkdir(dirname(filePath), { recursive: true });

    if (Buffer.isBuffer(data)) {
      await writeFile(filePath, data);
      return {
        key,
        size: data.length,
        contentType: options.contentType,
      };
    } else {
      // Readable stream
      const chunks: Buffer[] = [];
      for await (const chunk of data) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as ArrayBuffer));
      }
      const buffer = Buffer.concat(chunks);
      await writeFile(filePath, buffer);
      return {
        key,
        size: buffer.length,
        contentType: options.contentType,
      };
    }
  }

  async download(key: string): Promise<Buffer> {
    const filePath = this.resolvePath(key);
    try {
      return await readFile(filePath);
    } catch {
      throw new NotFoundError('File', key);
    }
  }

  async stream(key: string): Promise<Readable> {
    const filePath = this.resolvePath(key);
    await access(filePath, constants.R_OK);
    return createReadStream(filePath);
  }

  async delete(key: string): Promise<void> {
    const filePath = this.resolvePath(key);
    try {
      await unlink(filePath);
    } catch {
      // Ignore not found on delete
    }
  }

  async deleteMany(keys: string[]): Promise<void> {
    await Promise.allSettled(keys.map((k) => this.delete(k)));
  }

  async exists(key: string): Promise<boolean> {
    const filePath = this.resolvePath(key);
    try {
      await access(filePath, constants.F_OK);
      return true;
    } catch {
      return false;
    }
  }

  async stat(key: string): Promise<StorageObject> {
    const filePath = this.resolvePath(key);
    try {
      const stats = await stat(filePath);
      return {
        key,
        size: stats.size,
        contentType: 'application/octet-stream',
        lastModified: stats.mtime,
      };
    } catch {
      throw new NotFoundError('File', key);
    }
  }

  async presignDownload(key: string, options: PresignedUrlOptions = {}): Promise<string> {
    // For local storage, return a direct URL. In production, add time-based HMAC signing.
    const expires = Date.now() + (options.expiresIn ?? 3600) * 1000;
    return `${this.baseUrl}/storage/${encodeURIComponent(key)}?expires=${expires}`;
  }

  async presignUpload(key: string, options: PresignedUrlOptions): Promise<string> {
    const expires = Date.now() + (options.expiresIn ?? 3600) * 1000;
    return `${this.baseUrl}/storage/upload/${encodeURIComponent(key)}?expires=${expires}`;
  }

  async copy(sourceKey: string, destinationKey: string): Promise<StorageObject> {
    const srcPath = this.resolvePath(sourceKey);
    const destPath = this.resolvePath(destinationKey);
    await mkdir(dirname(destPath), { recursive: true });
    await copyFile(srcPath, destPath);
    return this.stat(destinationKey);
  }
}
