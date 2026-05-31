import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  mfaCode: z.string().optional(),
  tenantSlug: z.string().min(1),
});

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
        const data = (await res.json()) as { data: { tokens: { accessToken: string; refreshToken: string }; tenantId: string; user: Record<string, unknown> } };
        return {
          id: data.data.user['id'] as string,
          email: data.data.user['email'] as string,
          name: `${data.data.user['firstName']} ${data.data.user['lastName']}`,
          accessToken: data.data.tokens.accessToken,
          refreshToken: data.data.tokens.refreshToken,
          tenantId: data.data.tenantId,
        };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token['accessToken'] = (user as Record<string, unknown>)['accessToken'];
        token['refreshToken'] = (user as Record<string, unknown>)['refreshToken'];
        token['tenantId'] = (user as Record<string, unknown>)['tenantId'];
      }
      return token;
    },
    session({ session, token }) {
      session.user['accessToken'] = token['accessToken'] as string;
      session.user['tenantId'] = token['tenantId'] as string;
      return session;
    },
  },
  pages: {
    signIn: '/auth/login',
    error: '/auth/error',
  },
  session: { strategy: 'jwt' },
  secret: process.env['NEXTAUTH_SECRET'],
});
