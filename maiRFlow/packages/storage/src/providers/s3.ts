import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
  HeadObjectCommand,
  CopyObjectCommand,
  type PutObjectCommandInput,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import type { Readable } from 'node:stream';
import type {
  IStorageProvider,
  StorageObject,
  UploadOptions,
  PresignedUrlOptions,
} from '../provider.interface.js';
import { SystemError } from '@receiptflow/shared/errors';

export interface S3Config {
  region: string;
  bucket: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  endpoint?: string;         // for R2 / localstack
  forcePathStyle?: boolean;
}

export class S3StorageProvider implements IStorageProvider {
  readonly providerName = 'S3';
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor(config: S3Config) {
    this.bucket = config.bucket;
    this.client = new S3Client({
      region: config.region,
      ...(config.accessKeyId && config.secretAccessKey
        ? {
            credentials: {
              accessKeyId: config.accessKeyId,
              secretAccessKey: config.secretAccessKey,
            },
          }
        : {}),
      ...(config.endpoint ? { endpoint: config.endpoint } : {}),
      forcePathStyle: config.forcePathStyle ?? false,
    });
  }

  async upload(key: string, data: Buffer | Readable, options: UploadOptions): Promise<StorageObject> {
    const params: PutObjectCommandInput = {
      Bucket: this.bucket,
      Key: key,
      Body: data,
      ContentType: options.contentType,
      ServerSideEncryption: options.serverSideEncryption !== false ? 'AES256' : undefined,
      CacheControl: options.cacheControl,
      ContentDisposition: options.contentDisposition,
      Metadata: options.metadata,
    };

    try {
      const result = await this.client.send(new PutObjectCommand(params));
      return {
        key,
        size: Buffer.isBuffer(data) ? data.length : 0,
        contentType: options.contentType,
        etag: result.ETag,
      };
    } catch (err) {
      throw new SystemError(`S3 upload failed for key ${key}: ${String(err)}`);
    }
  }

  async download(key: string): Promise<Buffer> {
    const stream = await this.stream(key);
    return streamToBuffer(stream);
  }

  async stream(key: string): Promise<Readable> {
    try {
      const response = await this.client.send(
        new GetObjectCommand({ Bucket: this.bucket, Key: key }),
      );
      if (!response.Body) throw new SystemError(`Empty response body for key ${key}`);
      return response.Body as Readable;
    } catch (err) {
      throw new SystemError(`S3 download failed for key ${key}: ${String(err)}`);
    }
  }

  async delete(key: string): Promise<void> {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }

  async deleteMany(keys: string[]): Promise<void> {
    if (keys.length === 0) return;
    // S3 deleteObjects max 1000 per request
    const chunks = chunk(keys, 1000);
    for (const batch of chunks) {
      await this.client.send(
        new DeleteObjectsCommand({
          Bucket: this.bucket,
          Delete: { Objects: batch.map((Key) => ({ Key })) },
        }),
      );
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      await this.stat(key);
      return true;
    } catch {
      return false;
    }
  }

  async stat(key: string): Promise<StorageObject> {
    try {
      const head = await this.client.send(
        new HeadObjectCommand({ Bucket: this.bucket, Key: key }),
      );
      return {
        key,
        size: head.ContentLength ?? 0,
        contentType: head.ContentType ?? 'application/octet-stream',
        etag: head.ETag,
        lastModified: head.LastModified,
        metadata: head.Metadata,
      };
    } catch (err) {
      throw new SystemError(`S3 stat failed for key ${key}: ${String(err)}`);
    }
  }

  async presignDownload(key: string, options: PresignedUrlOptions = {}): Promise<string> {
    return getSignedUrl(
      this.client,
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
      { expiresIn: options.expiresIn ?? 3600 },
    );
  }

  async presignUpload(key: string, options: PresignedUrlOptions): Promise<string> {
    return getSignedUrl(
      this.client,
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        ContentType: options.contentType,
        ContentLength: options.contentLength,
        ServerSideEncryption: 'AES256',
      }),
      { expiresIn: options.expiresIn ?? 3600 },
    );
  }

  async copy(sourceKey: string, destinationKey: string): Promise<StorageObject> {
    await this.client.send(
      new CopyObjectCommand({
        Bucket: this.bucket,
        CopySource: `${this.bucket}/${sourceKey}`,
        Key: destinationKey,
      }),
    );
    return this.stat(destinationKey);
  }
}

// ─── Cloudflare R2 uses the S3 adapter with a custom endpoint ────────────────

export interface R2Config {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  publicUrl?: string;
}

export function createR2Provider(config: R2Config): S3StorageProvider {
  return new S3StorageProvider({
    region: 'auto',
    bucket: config.bucket,
    accessKeyId: config.accessKeyId,
    secretAccessKey: config.secretAccessKey,
    endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
    forcePathStyle: false,
  });
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function chunk<T>(arr: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size));
  }
  return result;
}

async function streamToBuffer(stream: Readable): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as ArrayBuffer));
  }
  return Buffer.concat(chunks);
}
