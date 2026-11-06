import { NextResponse, type NextRequest } from 'next/server';
import { upsertUser } from '@palanotes/db';
import { getConfig } from '@/server/config';
import { clearLoginCookie, setSessionCookie } from '@/server/cookies';
import { getDb } from '@/server/db';
import { finishLogin } from '@/server/oidc';
import { createSessionToken, LOGIN_COOKIE, readLoginToken } from '@/server/session-token';
import { appUrl } from '@/server/urls';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest): Promise<Response> {
  const config = getConfig();
  const login = await readLoginToken(
    request.cookies.get(LOGIN_COOKIE)?.value,
    config.sessionSecret,
  );
  const failed = (reason: string): Response => {
    console.warn(`[auth] sign-in failed: ${reason}`);
    const response = NextResponse.redirect(appUrl(config, '/signed-out?error=1'));
    clearLoginCookie(response, config);
    return response;
  };

  if (!login) {
    return failed('missing or expired login cookie');
  }

  let identity;
  try {
    identity = await finishLogin(config, request.nextUrl.searchParams, login);
  } catch (error) {
    return failed(error instanceof Error ? error.message : 'unknown error');
  }

  const user = await upsertUser(getDb(), {
    authSubject: identity.subject,
    displayName: identity.displayName,
  });
  const session = await createSessionToken(
    { userId: user.id, subject: user.authSubject },
    config.sessionSecret,
  );
  const response = NextResponse.redirect(appUrl(config, login.returnTo));
  clearLoginCookie(response, config);
  setSessionCookie(response, config, session);
  return response;
}
