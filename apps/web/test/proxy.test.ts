import { beforeAll, describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { proxy } from '@/proxy';
import { createSessionToken, SESSION_COOKIE } from '@/server/session-token';

const ORIGIN = 'http://localhost:3100';
const SECRET = 'proxy-test-session-secret-long-enough';
const TOKEN = `pn_${'a'.repeat(43)}`;

beforeAll(() => {
  Object.assign(process.env, {
    DATABASE_URL: 'postgres://unused@localhost/unused',
    PUBLIC_URL: ORIGIN,
    BASE_PATH: '/notes',
    SESSION_SECRET: SECRET,
    OIDC_ISSUER: 'http://localhost:9400',
    OIDC_CLIENT_ID: 'palanotes',
    OIDC_CLIENT_SECRET: 'secret',
    OIDC_REDIRECT_URI: `${ORIGIN}/notes/api/auth/callback`,
  });
});

function request(path: string, init: { method?: string; headers?: Record<string, string> } = {}) {
  return new NextRequest(`${ORIGIN}/notes${path}`, {
    method: init.method ?? 'GET',
    headers: init.headers,
    nextConfig: { basePath: '/notes' },
  });
}

// NextResponse.next() marks the response so Next goes on to the route handler.
function reachesHandler(response: Response): boolean {
  return response.headers.get('x-middleware-next') === '1';
}

async function sessionCookie(): Promise<string> {
  const token = await createSessionToken({ userId: 'u', subject: 's' }, SECRET);
  return `${SESSION_COOKIE}=${token}`;
}

describe('proxy', () => {
  it('still refuses a cross-origin POST to an app route, even with a session', async () => {
    const response = await proxy(
      request('/api/entries', {
        method: 'POST',
        headers: { origin: 'https://evil.example', cookie: await sessionCookie() },
      }),
    );
    expect(response.status).toBe(403);
  });

  it('lets a same-origin POST with a session through to the app route', async () => {
    const response = await proxy(
      request('/api/entries', {
        method: 'POST',
        headers: { origin: ORIGIN, cookie: await sessionCookie() },
      }),
    );
    expect(reachesHandler(response)).toBe(true);
  });

  it('refuses a personal token on an app route', async () => {
    for (const [method, path] of [
      ['POST', '/api/entries'],
      ['GET', '/api/entries'],
      ['DELETE', '/api/trash'],
    ] as const) {
      const response = await proxy(
        request(path, { method, headers: { origin: ORIGIN, authorization: `Bearer ${TOKEN}` } }),
      );
      expect(response.status).toBe(401);
    }
  });

  it('sends /api/v1 requests to their handler, which checks the token', async () => {
    expect(reachesHandler(await proxy(request('/api/v1/notes')))).toBe(true);
    const post = await proxy(request('/api/v1/entries', { method: 'POST' }));
    expect(reachesHandler(post)).toBe(true);
  });

  it('does not treat a path that only starts like /api/v1 as one', async () => {
    const response = await proxy(request('/api/v1notes'));
    expect(response.status).toBe(401);
  });
});
