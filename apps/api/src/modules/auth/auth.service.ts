import type { PrismaClient } from '@receiptflow/database';
import type { JwtService } from '@receiptflow/auth/jwt';
import type { EncryptionService } from '@receiptflow/auth/encryption';
import type { IEmailProvider } from '@receiptflow/notifications';
import {
  hashPassword,
  verifyPassword,
  validatePasswordStrength,
  generateSecureToken,
  hashToken,
} from '@receiptflow/auth/password';
import {
  AuthError,
  ConflictError,
  NotFoundError,
  ValidationError,
  BusinessRuleError,
} from '@receiptflow/shared/errors';
import type { TokenPair } from '@receiptflow/auth/jwt';
import { verifyEmailTemplate, resetPasswordTemplate } from '@receiptflow/notifications';
import { generateMfaSetup, verifyMfaToken } from '@receiptflow/auth/mfa';

export interface RegisterInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  organizationName: string;
  tenantSlug: string;
}

export interface LoginInput {
  email: string;
  password: string;
  mfaToken?: string;
  tenantSlug: string;
  mfaCode?: string;
}

export interface AuthResult {
  tokens: TokenPair;
  tenantId: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    mfaEnabled: boolean;
  };
  requiresMfa?: boolean;
}

export class AuthService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly jwt: JwtService,
    private readonly encryption: EncryptionService,
    private readonly email: IEmailProvider,
    private readonly emailFrom: { email: string; name: string },
  ) {}

  async register(input: RegisterInput): Promise<{ userId: string; tenantId: string }> {
    const pwStrength = validatePasswordStrength(input.password);
    if (!pwStrength.valid) {
      throw new ValidationError(`Password too weak: ${pwStrength.errors.join(', ')}`);
    }

    const existing = await this.prisma.user.findFirst({
      where: { email: input.email.toLowerCase(), deletedAt: null },
    });
    if (existing) throw new ConflictError('A user with this email already exists');

    const slugExists = await this.prisma.tenant.findFirst({
      where: { slug: input.tenantSlug, deletedAt: null },
    });
    if (slugExists) throw new ConflictError('This organization slug is already taken');

    const passwordHash = await hashPassword(input.password);
    const verificationToken = generateSecureToken();
    const verificationHash = hashToken(verificationToken);

    const result = await this.prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: {
          name: input.organizationName,
          slug: input.tenantSlug,
          status: 'ACTIVE',
          plan: 'STARTER',
        },
      });

      const org = await tx.organization.create({
        data: {
          tenantId: tenant.id,
          name: input.organizationName,
          slug: input.tenantSlug,
          isDefault: true,
        },
      });

      const user = await tx.user.create({
        data: {
          tenantId: tenant.id,
          email: input.email.toLowerCase(),
          passwordHash,
          firstName: input.firstName,
          lastName: input.lastName,
          status: 'PENDING_VERIFICATION',
          emailVerified: false,
        },
      });

      await tx.userOrganization.create({
        data: { userId: user.id, organizationId: org.id, isOwner: true },
      });

      await tx.emailVerification.create({
        data: {
          userId: user.id,
          tokenHash: verificationHash,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      });

      return { tenant, org, user };
    });

    // Send verification email (non-blocking — don't fail registration)
    this.email
      .send({
        from: this.emailFrom,
        to: { email: input.email, name: `${input.firstName} ${input.lastName}` },
        ...verifyEmailTemplate({ name: input.firstName, token: verificationToken }),
      })
      .catch(() => {/* logged by email provider */});

    return { userId: result.user.id, tenantId: result.tenant.id };
  }

  async login(input: LoginInput): Promise<AuthResult> {
    // Resolve tenantSlug → tenant → organization
    const tenant = await this.prisma.tenant.findFirst({
      where: { slug: input.tenantSlug, deletedAt: null },
      include: { organizations: { where: { deletedAt: null }, select: { id: true } } },
    });
    if (!tenant) throw new AuthError('Invalid credentials', 'INVALID_CREDENTIALS');
    const organizationId = tenant.organizations[0]?.id;
    if (!organizationId) throw new AuthError('Invalid credentials', 'INVALID_CREDENTIALS');

    const mfaToken = input.mfaToken ?? input.mfaCode;

    const user = await this.prisma.user.findFirst({
      where: { email: input.email.toLowerCase(), deletedAt: null },
      include: {
        organizations: {
          where: { organizationId },
          include: {
            organization: { select: { tenantId: true } },
            roles: {
              include: {
                role: {
                  include: {
                    permissions: {
                      include: { permission: { select: { resource: true, action: true } } },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!user) throw new AuthError('Invalid credentials', 'INVALID_CREDENTIALS');
    const isValid = await verifyPassword(input.password, user.passwordHash);
    if (!isValid) throw new AuthError('Invalid credentials', 'INVALID_CREDENTIALS');
    if (user.status === 'SUSPENDED') throw new AuthError('Account suspended', 'ACCOUNT_SUSPENDED');

    // MFA check
    if (user.mfaEnabled && user.mfaSecret) {
      if (!mfaToken) {
        return {
          tokens: { accessToken: '', refreshToken: '', accessTokenExpiresAt: new Date(0), refreshTokenExpiresAt: new Date(0) },
          tenantId: tenant.id,
          user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            mfaEnabled: true,
          },
          requiresMfa: true,
        };
      }

      const decryptedSecret = this.encryption.decrypt(user.mfaSecret);
      const mfaValid = verifyMfaToken(mfaToken, decryptedSecret);
      if (!mfaValid) throw new AuthError('Invalid MFA token', 'MFA_INVALID');
    }

    const tenantId = (user as any).organizations[0]?.organization.tenantId ?? user.tenantId;
    const roles = (user as any).organizations.flatMap((uo: any) => uo.roles.map((ur: any) => ur.role.name)) as string[];
    const permissions = [
      ...new Set(
        user.organizations.flatMap((uo: any) =>
          uo.roles.flatMap((ur: any) =>
            ur.role.permissions.map((rp: any) => `${rp.permission.resource}:${rp.permission.action}`),
          ),
        ),
      ),
    ] as string[];

    const family = this.jwt.generateTokenFamily();
    const accessToken = this.jwt.signAccessToken({
      sub: user.id,
      tid: tenantId,
      oid: organizationId,
      email: user.email,
      roles,
      permissions,
    });
    const refreshToken = this.jwt.signRefreshToken(user.id, tenantId, family);
    const tokens: TokenPair = {
      accessToken,
      refreshToken,
      accessTokenExpiresAt: this.jwt.getAccessTokenExpiry(),
      refreshTokenExpiresAt: this.jwt.getRefreshTokenExpiry(),
    };

    // Persist refresh token hash
    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tenantId,
        tokenHash: await hashToken(refreshToken),
        family,
        expiresAt: tokens.refreshTokenExpiresAt,
        userAgent: '',
        ipAddress: '',
      },
    });

    return {
      tokens,
      tenantId,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        mfaEnabled: user.mfaEnabled,
      },
    };
  }

  async refreshToken(token: string): Promise<TokenPair> {
    let payload;
    try {
      payload = this.jwt.verifyRefreshToken(token);
    } catch {
      throw new AuthError('Invalid refresh token', 'TOKEN_INVALID');
    }

    const stored = await this.prisma.refreshToken.findFirst({
      where: {
        tokenHash: hashToken(token),
        userId: payload.sub,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      include: {
        user: {
          include: {
            userRoles: {
              include: {
                role: {
                  include: { rolePermissions: { include: { permission: true } } },
                },
              },
            },
          },
        },
      },
    });

    if (!stored) {
      // Possible token reuse — revoke entire family
      await this.prisma.refreshToken.updateMany({
        where: { family: payload.family },
        data: { revokedAt: new Date() },
      });
      throw new AuthError('Refresh token reuse detected', 'TOKEN_REUSE');
    }

    // Rotate: revoke old, issue new
    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });

    const roles = stored.user.userRoles.map((ur) => ur.role.name);
    const permissions = [
      ...new Set(
        stored.user.userRoles.flatMap((ur) =>
          ur.role.rolePermissions.map((rp) => rp.permission.name),
        ),
      ),
    ];

    const newTokens = await this.jwt.generateTokenFamily({
      sub: stored.user.id,
      tid: stored.tenantId,
      oid: stored.user.userRoles[0]?.organizationId ?? '',
      email: stored.user.email,
      roles,
      permissions,
    });

    await this.prisma.refreshToken.create({
      data: {
        userId: stored.user.id,
        tenantId: stored.tenantId,
        tokenHash: hashToken(newTokens.refreshToken),
        family: payload.family,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        userAgent: stored.userAgent,
        ipAddress: stored.ipAddress,
      },
    });

    return newTokens;
  }

  async logout(refreshToken: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash: hashToken(refreshToken), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async verifyEmail(token: string): Promise<void> {
    const hash = hashToken(token);
    const verification = await this.prisma.emailVerification.findFirst({
      where: { tokenHash: hash, usedAt: null, expiresAt: { gt: new Date() } },
    });
    if (!verification) throw new NotFoundError('Verification token is invalid or expired');

    await this.prisma.$transaction([
      this.prisma.emailVerification.update({
        where: { id: verification.id },
        data: { usedAt: new Date() },
      }),
      this.prisma.user.update({
        where: { id: verification.userId },
        data: { emailVerified: true, status: 'ACTIVE' },
      }),
    ]);
  }

  async forgotPassword(email: string): Promise<void> {
    const user = await this.prisma.user.findFirst({
      where: { email: email.toLowerCase(), deletedAt: null },
    });
    // Always resolve successfully — don't leak whether email exists
    if (!user) return;

    const token = generateSecureToken();
    await this.prisma.passwordReset.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(token),
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    });

    this.email
      .send({
        from: this.emailFrom,
        to: { email: user.email, name: `${user.firstName} ${user.lastName}` },
        ...resetPasswordTemplate({ name: user.firstName, token }),
      })
      .catch(() => {});
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const pwStrength = validatePasswordStrength(newPassword);
    if (!pwStrength.valid) {
      throw new ValidationError(`Password too weak: ${pwStrength.errors.join(', ')}`);
    }

    const hash = hashToken(token);
    const reset = await this.prisma.passwordReset.findFirst({
      where: { tokenHash: hash, usedAt: null, expiresAt: { gt: new Date() } },
    });
    if (!reset) throw new NotFoundError('Reset token is invalid or expired');

    const passwordHash = await hashPassword(newPassword);
    await this.prisma.$transaction([
      this.prisma.passwordReset.update({
        where: { id: reset.id },
        data: { usedAt: new Date() },
      }),
      this.prisma.user.update({
        where: { id: reset.userId },
        data: { passwordHash },
      }),
      // Revoke all refresh tokens on password change
      this.prisma.refreshToken.updateMany({
        where: { userId: reset.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);
  }

  async setupMfa(userId: string): Promise<{ otpauthUrl: string; qrCodeDataUrl: string; backupCodes: string[] }> {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
      select: { email: true, mfaEnabled: true },
    });
    if (!user) throw new NotFoundError('User not found');
    if (user.mfaEnabled) throw new BusinessRuleError('MFA is already enabled');

    const setup = await generateMfaSetup(user.email, 'ReceiptFlow AI');
    const encryptedSecret = this.encryption.encrypt(setup.secret);

    await this.prisma.user.update({
      where: { id: userId },
      data: { mfaSecret: encryptedSecret },
    });

    return {
      otpauthUrl: setup.otpauthUrl,
      qrCodeDataUrl: setup.qrCodeDataUrl,
      backupCodes: setup.backupCodes,
    };
  }

  async confirmMfa(userId: string, token: string): Promise<void> {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
      select: { mfaSecret: true, mfaEnabled: true },
    });
    if (!user?.mfaSecret) throw new BusinessRuleError('MFA setup not started');
    if (user.mfaEnabled) throw new BusinessRuleError('MFA already confirmed');

    const secret = this.encryption.decrypt(user.mfaSecret);
    if (!verifyMfaToken(token, secret)) {
      throw new AuthError('Invalid MFA token', 'MFA_INVALID');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { mfaEnabled: true },
    });
  }
}

function randomFamily(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}
