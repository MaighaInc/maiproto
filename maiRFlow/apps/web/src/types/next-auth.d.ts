import type { DefaultSession, DefaultUser } from 'next-auth';
import type { DefaultJWT } from 'next-auth/jwt';

declare module 'next-auth' {
  interface User extends DefaultUser {
    accessToken: string;
    refreshToken: string;
    tenantId: string;
    /** ISO date string from the API login response */
    accessTokenExpiresAt?: string;
  }

  interface Session extends DefaultSession {
    user: DefaultSession['user'] & {
      accessToken: string;
      tenantId: string;
    };
    error?: 'RefreshTokenError';
  }
}

declare module 'next-auth/jwt' {
  interface JWT extends DefaultJWT {
    accessToken?: string;
    refreshToken?: string;
    tenantId?: string;
    /** Unix timestamp (seconds) when the access token expires */
    accessTokenExpiresAt?: number;
    error?: 'RefreshTokenError';
  }
}
