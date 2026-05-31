import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword } from '../password.js';

describe('password hashing', () => {
  it('should hash and verify a password correctly', async () => {
    const password = 'SecureP@ssw0rd!';
    const hash = await hashPassword(password);
    expect(hash).toBeTruthy();
    expect(hash).not.toBe(password);

    const isValid = await verifyPassword(password, hash);
    expect(isValid).toBe(true);
  });

  it('should return false for wrong password', async () => {
    const hash = await hashPassword('correct-password');
    const isValid = await verifyPassword('wrong-password', hash);
    expect(isValid).toBe(false);
  });

  it('should produce different hashes for same password (salted)', async () => {
    const hash1 = await hashPassword('same-password');
    const hash2 = await hashPassword('same-password');
    expect(hash1).not.toBe(hash2);
  });
});
