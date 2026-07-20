import { describe, it, expect } from 'vitest';
import { EncryptionService } from '../encryption.js';

describe('EncryptionService', () => {
  const key = '0'.repeat(64); // 64 hex chars = 32 bytes
  const service = new EncryptionService(key);

  it('should encrypt and decrypt symmetrically', () => {
    const plaintext = 'secret data 1234!';
    const encrypted = service.encrypt(plaintext);
    expect(encrypted.ciphertext).not.toBe(plaintext);

    const decrypted = service.decrypt(encrypted.ciphertext, encrypted.iv, encrypted.authTag);
    expect(decrypted).toBe(plaintext);
  });

  it('should produce different ciphertext each time (random IV)', () => {
    const plaintext = 'same-input';
    const e1 = service.encrypt(plaintext);
    const e2 = service.encrypt(plaintext);
    expect(e1.iv).not.toBe(e2.iv);
    expect(e1.ciphertext).not.toBe(e2.ciphertext);
  });

  it('should throw on tampered ciphertext', () => {
    const { ciphertext, iv, authTag } = service.encrypt('hello');
    const tampered = ciphertext.slice(0, -2) + 'ff';
    expect(() => service.decrypt(tampered, iv, authTag)).toThrow();
  });
});
