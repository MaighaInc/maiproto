import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { z } from 'zod';
import type { JWT } from 'next-auth/jwt';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  mfaCode: z.string().optional(),
  tenantSlug: z.string().min(1),
});

/** Refresh 60 seconds before actual expiry to avoid races */
const REFRESH_BUFFER_SECS = 60;

async function refreshAccessToken(token: JWT): Promise<JWT> {
  try {
    const apiUrl = process.env['NEXT_PUBLIC_API_URL'];
    const res = await fetch(`${apiUrl}/api/v1/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: token.refreshToken }),
    });
    if (!res.ok) throw new Error(`Refresh failed: ${res.status}`);
    const body = (await res.json()) as {
      data: { accessToken: string; refreshToken: string; accessTokenExpiresAt: string };
    };
    const { accessToken, refreshToken, accessTokenExpiresAt } = body.data;
    return {
      ...token,
      accessToken,
      refreshToken,
      accessTokenExpiresAt: Math.floor(new Date(accessTokenExpiresAt).getTime() / 1000),
    };
  } catch {
    return { ...token, error: 'RefreshTokenError' };
  }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: {},
        password: {},
        mfaCode: {},
        tenantSlug: {},
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const apiUrl = process.env['NEXT_PUBLIC_API_URL'];
        const res = await fetch(`${apiUrl}/api/v1/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(parsed.data),
        });

        if (!res.ok) return null;
        const data = (await res.json()) as {
          data: {
            tokens: { accessToken: string; refreshToken: string; accessTokenExpiresAt: string };
            tenantId: string;
            user: Record<string, unknown>;
          };
        };
        return {
          id: data.data.user['id'] as string,
          email: data.data.user['email'] as string,
          name: `${data.data.user['firstName']} ${data.data.user['lastName']}`,
          accessToken: data.data.tokens.accessToken,
          refreshToken: data.data.tokens.refreshToken,
          accessTokenExpiresAt: data.data.tokens.accessTokenExpiresAt,
          tenantId: data.data.tenantId,
        };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      // On sign-in, persist all token fields
      if (user) {
        const u = user as typeof user & { accessTokenExpiresAt?: string };
        token.accessToken = u.accessToken;
        token.refreshToken = u.refreshToken;
        token.tenantId = u.tenantId;
        token.accessTokenExpiresAt = u.accessTokenExpiresAt
          ? Math.floor(new Date(u.accessTokenExpiresAt).getTime() / 1000)
          : Math.floor(Date.now() / 1000) + 15 * 60; // fallback: 15 min
      }

      // Return existing token if still valid
      const nowSecs = Math.floor(Date.now() / 1000);
      if (token.accessTokenExpiresAt && nowSecs < token.accessTokenExpiresAt - REFRESH_BUFFER_SECS) {
        return token;
      }

      // Access token has expired or is about to — refresh it
      return refreshAccessToken(token);
    },
    session({ session, token }) {
      session.user.accessToken = token.accessToken ?? '';
      session.user.tenantId = token.tenantId ?? '';
      if (token.error) session.error = token.error;
      return session;
    },
  },
  pages: {
    signIn: '/auth/login',
    error: '/auth/error',
  },
  session: { strategy: 'jwt' },
  secret: process.env['NEXTAUTH_SECRET']!,
});
