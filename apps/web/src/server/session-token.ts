import { jwtVerify, SignJWT } from 'jose';

export const SESSION_COOKIE = 'palawi_notes_session';
export const LOGIN_COOKIE = 'palawi_notes_login';
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;
export const LOGIN_MAX_AGE_SECONDS = 60 * 10;

const ISSUER = 'palanotes';

export interface SessionPayload {
  userId: string;
  subject: string;
}

export interface LoginPayload {
  codeVerifier: string;
  state: string;
  nonce: string;
  returnTo: string;
}

function key(secret: string): Uint8Array {
  return new TextEncoder().encode(secret);
}

async function sign(
  claims: Record<string, string>,
  audience: string,
  maxAgeSeconds: number,
  secret: string,
): Promise<string> {
  return new SignJWT(claims)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuer(ISSUER)
    .setAudience(audience)
    .setIssuedAt()
    .setExpirationTime(`${maxAgeSeconds}s`)
    .sign(key(secret));
}

async function verify(
  token: string | undefined,
  audience: string,
  secret: string,
): Promise<Record<string, unknown> | null> {
  if (!token) {
    return null;
  }
  try {
    const { payload } = await jwtVerify(token, key(secret), {
      issuer: ISSUER,
      audience,
      algorithms: ['HS256'],
    });
    return payload;
  } catch {
    return null;
  }
}

function readString(payload: Record<string, unknown>, name: string): string | null {
  const value = payload[name];
  return typeof value === 'string' && value.length > 0 ? value : null;
}

export function createSessionToken(session: SessionPayload, secret: string): Promise<string> {
  return sign(
    { uid: session.userId, sub: session.subject },
    'session',
    SESSION_MAX_AGE_SECONDS,
    secret,
  );
}

export async function readSessionToken(
  token: string | undefined,
  secret: string,
): Promise<SessionPayload | null> {
  const payload = await verify(token, 'session', secret);
  if (!payload) {
    return null;
  }
  const userId = readString(payload, 'uid');
  const subject = readString(payload, 'sub');
  return userId && subject ? { userId, subject } : null;
}

export function createLoginToken(login: LoginPayload, secret: string): Promise<string> {
  return sign(
    { cv: login.codeVerifier, st: login.state, nn: login.nonce, rt: login.returnTo },
    'login',
    LOGIN_MAX_AGE_SECONDS,
    secret,
  );
}

export async function readLoginToken(
  token: string | undefined,
  secret: string,
): Promise<LoginPayload | null> {
  const payload = await verify(token, 'login', secret);
  if (!payload) {
    return null;
  }
  const codeVerifier = readString(payload, 'cv');
  const state = readString(payload, 'st');
  const nonce = readString(payload, 'nn');
  const returnTo = readString(payload, 'rt');
  return codeVerifier && state && nonce && returnTo
    ? { codeVerifier, state, nonce, returnTo }
    : null;
}

// Only same-app relative paths, so the login flow cannot be turned into an open redirect.
export function safeReturnTo(value: string | null | undefined): string {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.includes('\\')) {
    return '/';
  }
  return value;
}
