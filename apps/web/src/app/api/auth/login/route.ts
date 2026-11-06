import { NextResponse, type NextRequest } from 'next/server';
import { getConfig } from '@/server/config';
import { setLoginCookie } from '@/server/cookies';
import { startLogin } from '@/server/oidc';
import { createLoginToken, safeReturnTo } from '@/server/session-token';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest): Promise<Response> {
  const config = getConfig();
  const login = await startLogin(config);
  const token = await createLoginToken(
    {
      codeVerifier: login.codeVerifier,
      state: login.state,
      nonce: login.nonce,
      returnTo: safeReturnTo(request.nextUrl.searchParams.get('returnTo')),
    },
    config.sessionSecret,
  );
  const response = NextResponse.redirect(login.url);
  setLoginCookie(response, config, token);
  return response;
}
