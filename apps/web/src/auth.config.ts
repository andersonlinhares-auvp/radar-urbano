import type { NextAuthConfig } from 'next-auth';
import Google from 'next-auth/providers/google';

// Edge-safe config: no adapter, no bcrypt, no db imports.
// Used by middleware.ts to avoid Node-only modules in the Edge runtime.
const authConfig = {
  providers: [Google],
  session: { strategy: 'jwt' as const },
  callbacks: {
    jwt({ token, user }: { token: import('next-auth/jwt').JWT; user?: import('next-auth').User }) {
      if (user) token.uid = user.id;
      return token;
    },
    session({
      session,
      token,
    }: {
      session: import('next-auth').Session;
      token: import('next-auth/jwt').JWT;
    }) {
      if (token.uid && session.user) session.user.id = String(token.uid);
      return session;
    },
  },
} satisfies NextAuthConfig;

export default authConfig;
