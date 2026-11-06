import type { NextResponse } from 'next/server';
import type { AppConfig } from './config';
import {
  LOGIN_COOKIE,
  LOGIN_MAX_AGE_SECONDS,
  SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS,
} from './session-token';

function base(config: AppConfig) {
  return { httpOnly: true, secure: config.secureCookies, sameSite: 'lax' as const };
}

export function setSessionCookie(response: NextResponse, config: AppConfig, token: string): void {
  response.cookies.set(SESSION_COOKIE, token, {
    ...base(config),
    path: config.basePath || '/',
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

export function clearSessionCookie(response: NextResponse, config: AppConfig): void {
  response.cookies.set(SESSION_COOKIE, '', {
    ...base(config),
    path: config.basePath || '/',
    maxAge: 0,
  });
}

export function setLoginCookie(response: NextResponse, config: AppConfig, token: string): void {
  response.cookies.set(LOGIN_COOKIE, token, {
    ...base(config),
    path: `${config.basePath}/api/auth`,
    maxAge: LOGIN_MAX_AGE_SECONDS,
  });
}

export function clearLoginCookie(response: NextResponse, config: AppConfig): void {
  response.cookies.set(LOGIN_COOKIE, '', {
    ...base(config),
    path: `${config.basePath}/api/auth`,
    maxAge: 0,
  });
}
