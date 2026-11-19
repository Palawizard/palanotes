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
// WARNING: every route under /api/v1/ skips the cookie and origin checks below, so each one
// must authenticate the request by its personal token itself (see server/api-v1.ts).
const API_V1_PREFIX = '/api/v1/';

// Optimistic check from the cookie only. Pages and route handlers still load the
// account from the database before touching any data.
export async function proxy(request: NextRequest): Promise<Response> {
  const config = getConfig();
  const { pathname, search } = request.nextUrl;

  // Other apps call these from their server with a personal token, which the route handlers
  // check. A browser never adds that header by itself, so the origin check has nothing to
  // protect there, and the session cookie is not accepted on these routes.
  if (pathname.startsWith(API_V1_PREFIX)) {
    return NextResponse.next();
  }
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
