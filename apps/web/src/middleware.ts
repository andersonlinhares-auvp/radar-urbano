import NextAuth from 'next-auth';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import authConfig from './auth.config';

const { auth } = NextAuth(authConfig);

const PROTECTED = [/^\/mapa/, /^\/painel/, /^\/reportar/, /^\/api\/(tiles|incidents|risk)/];

function middleware(req: NextRequest & { auth: { user?: unknown } | null }): Response | undefined {
  const { pathname } = req.nextUrl;
  const isProtected = PROTECTED.some((re) => re.test(pathname));
  if (!isProtected) return NextResponse.next();
  if (req.auth?.user) return NextResponse.next();
  if (pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  }
  const url = new URL('/entrar', req.nextUrl);
  url.searchParams.set('next', pathname);
  return NextResponse.redirect(url);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default auth(middleware as any);

export const config = {
  matcher: ['/mapa/:path*', '/painel/:path*', '/reportar/:path*', '/api/:path*'],
};
