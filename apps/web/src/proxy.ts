import { NextResponse, type NextRequest } from 'next/server';
import { getConfig } from '@/server/config';
import { isAllowedOrigin } from '@/server/origin';
import { readSessionToken, SESSION_COOKIE } from '@/server/session-token';
import { appUrl } from '@/server/urls';

const PUBLIC_PATHS = new Set([
  '/api/health',
  '/api/auth/login',
  '/api/auth/callback',
  '/api/auth/logout',
  '/signed-out',
]);

// Optimistic check from the cookie only. Pages and route handlers still load the
// account from the database before touching any data.
export async function proxy(request: NextRequest): Promise<Response> {
  const config = getConfig();
  const { pathname, search } = request.nextUrl;

  if (!isAllowedOrigin(request.method, request.headers, config.publicOrigin)) {
    return Response.json({ error: 'forbidden' }, { status: 403 });
  }
  if (PUBLIC_PATHS.has(pathname)) {
    return NextResponse.next();
  }

  const session = await readSessionToken(
    request.cookies.get(SESSION_COOKIE)?.value,
    config.sessionSecret,
  );
  if (session) {
    return NextResponse.next();
  }
  if (pathname.startsWith('/api/')) {
    return Response.json({ error: 'unauthorized' }, { status: 401 });
  }
  const login = appUrl(config, '/api/auth/login');
  login.searchParams.set('returnTo', `${pathname}${search}`);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icon.svg).*)'],
};
