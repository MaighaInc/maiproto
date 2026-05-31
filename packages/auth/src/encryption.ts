import { createCipheriv, createDecipheriv, randomBytes, createHash } from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const TAG_LENGTH = 16;

/**
 * Symmetric encryption service using AES-256-GCM.
 * Used for encrypting sensitive values at rest (MFA secrets, API key raw values, etc.)
 */
export class EncryptionService {
  private readonly key: Buffer;

  constructor(hexKey: string) {
    if (!/^[0-9a-fA-F]{64}$/.test(hexKey)) {
      throw new Error('ENCRYPTION_KEY must be a 64-character hex string (32 bytes)');
    }
    this.key = Buffer.from(hexKey, 'hex');
  }

  encrypt(plaintext: string): string {
    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(ALGORITHM, this.key, iv);
    const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    // Format: iv(12) + tag(16) + ciphertext — base64 encoded
    const combined = Buffer.concat([iv, tag, encrypted]);
    return combined.toString('base64url');
  }

  decrypt(encoded: string): string {
    const combined = Buffer.from(encoded, 'base64url');
    if (combined.length < IV_LENGTH + TAG_LENGTH) {
      throw new Error('Invalid ciphertext');
    }
    const iv = combined.subarray(0, IV_LENGTH);
    const tag = combined.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
    const ciphertext = combined.subarray(IV_LENGTH + TAG_LENGTH);
    const decipher = createDecipheriv(ALGORITHM, this.key, iv);
    decipher.setAuthTag(tag);
    return decipher.update(ciphertext) + decipher.final('utf8');
  }

  /**
   * Deterministic HMAC hash — suitable for searchable encrypted fields.
   */
  hmac(value: string): string {
    const hmac = createHash('sha256');
    hmac.update(this.key);
    hmac.update(value);
    return hmac.digest('hex');
  }
}
