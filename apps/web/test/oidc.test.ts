import { OAuth2Server } from 'oauth2-mock-server';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { AppConfig } from '@/server/config';
import { finishLogin, startLogin } from '@/server/oidc';

const server = new OAuth2Server();
let config: AppConfig;

beforeAll(async () => {
  await server.issuer.keys.generate('RS256');
  await server.start(0, 'localhost');
  server.service.on('beforeTokenSigning', (token) => {
    if (token.payload.aud) {
      token.payload.sub = 'hashed-subject-123';
      token.payload.name = 'Palawi';
    }
  });
  config = {
    databaseUrl: 'unused',
    publicOrigin: 'http://localhost:3000',
    basePath: '/notes',
    sessionSecret: 'x'.repeat(32),
    secureCookies: true,
    oidc: {
      issuer: server.issuer.url ?? '',
      clientId: 'palanotes',
      clientSecret: 'secret',
      redirectUri: 'http://localhost:3000/notes/api/auth/callback',
    },
  };
});

afterAll(() => server.stop());

async function authorize(url: URL): Promise<URLSearchParams> {
  const response = await fetch(url, { redirect: 'manual' });
  const location = response.headers.get('location');
  if (!location) {
    throw new Error('authorization endpoint did not redirect');
  }
  return new URL(location).searchParams;
}

describe('OIDC sign-in', () => {
  it('sends PKCE, state and nonce, and returns the subject from the id token', async () => {
    const login = await startLogin(config);
    expect(login.url.searchParams.get('code_challenge_method')).toBe('S256');
    expect(login.url.searchParams.get('redirect_uri')).toBe(config.oidc.redirectUri);

    const params = await authorize(login.url);
    const identity = await finishLogin(config, params, login);

    expect(identity).toEqual({ subject: 'hashed-subject-123', displayName: 'Palawi' });
  });

  it('rejects a callback whose state does not match', async () => {
    const login = await startLogin(config);
    const params = await authorize(login.url);
    await expect(finishLogin(config, params, { ...login, state: 'other' })).rejects.toThrow();
  });

  it('rejects a code exchanged with another PKCE verifier', async () => {
    const login = await startLogin(config);
    const other = await startLogin(config);
    const params = await authorize(login.url);
    await expect(
      finishLogin(config, params, { ...login, codeVerifier: other.codeVerifier }),
    ).rejects.toThrow();
  });

  it('rejects an id token with another nonce', async () => {
    const login = await startLogin(config);
    const params = await authorize(login.url);
    await expect(finishLogin(config, params, { ...login, nonce: 'other' })).rejects.toThrow();
  });
});
