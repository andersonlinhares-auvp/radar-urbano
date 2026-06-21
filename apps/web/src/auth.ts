import NextAuth, { type NextAuthResult } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { eq } from 'drizzle-orm';
import { DrizzleAdapter } from '@auth/drizzle-adapter';
import { db } from '@radar-urbano/db';
import { accounts, sessions, users, verificationTokens } from '@radar-urbano/db/schema';
import { verifyPassword } from '@/lib/password';
import authConfig from './auth.config';

const result: NextAuthResult = NextAuth({
  ...authConfig,
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  providers: [
    ...authConfig.providers,
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(creds) {
        const email = String(creds?.email ?? '').toLowerCase();
        const password = String(creds?.password ?? '');
        if (!email || !password) return null;
        const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
        if (!user?.passwordHash) return null;
        if (!user.emailVerified) throw new Error('E-mail não verificado');
        const ok = await verifyPassword(password, user.passwordHash);
        if (!ok) return null;
        return { id: user.id, name: user.name, email: user.email, image: user.image };
      },
    }),
  ],
});

export const handlers: NextAuthResult['handlers'] = result.handlers;
export const auth: NextAuthResult['auth'] = result.auth;
export const signIn: NextAuthResult['signIn'] = result.signIn;
export const signOut: NextAuthResult['signOut'] = result.signOut;
