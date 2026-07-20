import jwt from 'jsonwebtoken';
import { randomBytes } from 'node:crypto';
import { AuthError } from '@receiptflow/shared/errors';

export interface AccessTokenPayload {
  sub: string;         // userId
  tid: string;         // tenantId
  oid: string;         // organizationId (current)
  email: string;
  roles: string[];
  permissions: string[];
  type: 'access';
}

export interface RefreshTokenPayload {
  sub: string;
  tid: string;
  family: string;      // rotation family
  type: 'refresh';
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: Date;
  refreshTokenExpiresAt: Date;
}

export interface JwtConfig {
  accessSecret: string;
  refreshSecret: string;
  accessExpiresIn: string;
  refreshExpiresIn: string;
}

export class JwtService {
  constructor(private readonly config: JwtConfig) {
    if (!config.accessSecret || config.accessSecret.length < 32) {
      throw new Error('JWT access secret must be at least 32 characters');
    }
    if (!config.refreshSecret || config.refreshSecret.length < 32) {
      throw new Error('JWT refresh secret must be at least 32 characters');
    }
  }

  signAccessToken(payload: Omit<AccessTokenPayload, 'type'>): string {
    return jwt.sign({ ...payload, type: 'access' }, this.config.accessSecret, {
      expiresIn: this.config.accessExpiresIn as jwt.SignOptions['expiresIn'],
      issuer: 'receiptflow',
      audience: 'receiptflow-api',
    });
  }

  signRefreshToken(userId: string, tenantId: string, family: string): string {
    const payload: RefreshTokenPayload = {
      sub: userId,
      tid: tenantId,
      family,
      type: 'refresh',
    };
    return jwt.sign(payload, this.config.refreshSecret, {
      expiresIn: this.config.refreshExpiresIn as jwt.SignOptions['expiresIn'],
      issuer: 'receiptflow',
      audience: 'receiptflow-refresh',
    });
  }

  verifyAccessToken(token: string): AccessTokenPayload {
    try {
      const decoded = jwt.verify(token, this.config.accessSecret, {
        issuer: 'receiptflow',
        audience: 'receiptflow-api',
      }) as AccessTokenPayload;
      if (decoded.type !== 'access') {
        throw new AuthError('Invalid token type', 'TOKEN_INVALID');
      }
      return decoded;
    } catch (err) {
      if (err instanceof jwt.TokenExpiredError) {
        throw new AuthError('Access token expired', 'TOKEN_EXPIRED');
      }
      if (err instanceof AuthError) throw err;
      throw new AuthError('Invalid access token', 'TOKEN_INVALID');
    }
  }

  verifyRefreshToken(token: string): RefreshTokenPayload {
    try {
      const decoded = jwt.verify(token, this.config.refreshSecret, {
        issuer: 'receiptflow',
        audience: 'receiptflow-refresh',
      }) as RefreshTokenPayload;
      if (decoded.type !== 'refresh') {
        throw new AuthError('Invalid token type', 'TOKEN_INVALID');
      }
      return decoded;
    } catch (err) {
      if (err instanceof jwt.TokenExpiredError) {
        throw new AuthError('Refresh token expired', 'SESSION_EXPIRED');
      }
      if (err instanceof AuthError) throw err;
      throw new AuthError('Invalid refresh token', 'TOKEN_INVALID');
    }
  }

  generateTokenFamily(): string {
    return randomBytes(16).toString('hex');
  }

  getAccessTokenExpiry(): Date {
    const ms = parseExpiry(this.config.accessExpiresIn);
    return new Date(Date.now() + ms);
  }

  getRefreshTokenExpiry(): Date {
    const ms = parseExpiry(this.config.refreshExpiresIn);
    return new Date(Date.now() + ms);
  }
}

function parseExpiry(expiry: string): number {
  const match = /^(\d+)([smhd])$/.exec(expiry);
  if (!match) throw new Error(`Invalid expiry format: ${expiry}`);
  const [, value, unit] = match;
  const num = parseInt(value!, 10);
  const multipliers: Record<string, number> = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };
  return num * (multipliers[unit!] ?? 1000);
}
