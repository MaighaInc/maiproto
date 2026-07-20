import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthService } from '../auth.service.js';
import type { PrismaClient } from '@receiptflow/database';
import type { JwtService } from '@receiptflow/auth/jwt';
import type { EncryptionService } from '@receiptflow/auth/encryption';
import type { IEmailProvider } from '@receiptflow/notifications';

const mockPrisma = {
  user: {
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  tenant: { findFirst: vi.fn() },
  organization: { findFirst: vi.fn() },
  userOrganization: { findFirst: vi.fn() },
  emailVerification: { create: vi.fn(), findFirst: vi.fn(), update: vi.fn() },
  passwordReset: { create: vi.fn(), findFirst: vi.fn(), update: vi.fn() },
  refreshToken: { create: vi.fn(), findFirst: vi.fn(), update: vi.fn(), updateMany: vi.fn(), delete: vi.fn() },
  $transaction: vi.fn((fn: (tx: unknown) => unknown) => fn(mockPrisma)),
} as unknown as PrismaClient;

const mockJwt = {
  generateTokenFamily: vi.fn().mockResolvedValue({ accessToken: 'at', refreshToken: 'rt' }),
  verifyAccessToken: vi.fn(),
  verifyRefreshToken: vi.fn(),
} as unknown as JwtService;

const mockEncryption = {
  encrypt: vi.fn().mockReturnValue({ ciphertext: 'c', iv: 'i', authTag: 't' }),
  decrypt: vi.fn(),
} as unknown as EncryptionService;

const mockEmail = {
  send: vi.fn().mockResolvedValue({ messageId: 'id', success: true }),
} as unknown as IEmailProvider;

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new AuthService(
      mockPrisma,
      mockJwt,
      mockEncryption,
      mockEmail,
      { email: 'no-reply@test.com', name: 'Test' },
    );
  });

  describe('register', () => {
    it('should throw if email already exists', async () => {
      vi.mocked(mockPrisma.user.findFirst).mockResolvedValueOnce({ id: '1' } as never);
      await expect(
        service.register({
          email: 'existing@test.com',
          password: 'ValidPass1!',
          firstName: 'Jane',
          lastName: 'Doe',
          organizationName: 'Acme',
          tenantSlug: 'acme',
        }),
      ).rejects.toThrow();
    });

    it('should throw if password is too weak', async () => {
      vi.mocked(mockPrisma.user.findFirst).mockResolvedValueOnce(null);
      vi.mocked(mockPrisma.tenant.findFirst).mockResolvedValueOnce(null);
      await expect(
        service.register({
          email: 'new@test.com',
          password: 'weak',
          firstName: 'Jane',
          lastName: 'Doe',
          organizationName: 'Acme',
          tenantSlug: 'acme',
        }),
      ).rejects.toThrow();
    });
  });
});
