import { describe, expect, it } from 'vitest';
import { isAllowedOrigin } from '@/server/origin';
import {
  createLoginToken,
  createSessionToken,
  readLoginToken,
  readSessionToken,
  safeReturnTo,
} from '@/server/session-token';

const secret = 'a'.repeat(32);

describe('session token', () => {
  it('round-trips the session', async () => {
    const token = await createSessionToken({ userId: 'u1', subject: 's1' }, secret);
    expect(await readSessionToken(token, secret)).toEqual({ userId: 'u1', subject: 's1' });
  });

  it('rejects a token signed with another secret or tampered with', async () => {
    const token = await createSessionToken({ userId: 'u1', subject: 's1' }, secret);
    expect(await readSessionToken(token, 'b'.repeat(32))).toBeNull();
    expect(await readSessionToken(`${token}x`, secret)).toBeNull();
    expect(await readSessionToken(undefined, secret)).toBeNull();
  });

  it('does not accept a login token as a session', async () => {
    const login = await createLoginToken(
      { codeVerifier: 'v', state: 's', nonce: 'n', returnTo: '/' },
      secret,
    );
    expect(await readSessionToken(login, secret)).toBeNull();
    expect(await readLoginToken(login, secret)).toEqual({
      codeVerifier: 'v',
      state: 's',
      nonce: 'n',
      returnTo: '/',
    });
  });
});

describe('safeReturnTo', () => {
  it.each([
    ['/folders/abc?x=1', '/folders/abc?x=1'],
    ['https://evil.example', '/'],
    ['//evil.example', '/'],
    ['/\\evil.example', '/'],
    [null, '/'],
  ])('%s -> %s', (input, expected) => {
    expect(safeReturnTo(input)).toBe(expected);
  });
});

describe('isAllowedOrigin', () => {
  const origin = 'https://palawi.fr';
  it('lets safe methods through', () => {
    expect(isAllowedOrigin('GET', new Headers(), origin)).toBe(true);
  });
  it('accepts a mutation from our origin', () => {
    expect(isAllowedOrigin('POST', new Headers({ origin }), origin)).toBe(true);
  });
  it('refuses a mutation from another site', () => {
    expect(isAllowedOrigin('POST', new Headers({ origin: 'https://evil.example' }), origin)).toBe(
      false,
    );
  });
  it('refuses a mutation without origin unless the browser says same-origin', () => {
    expect(isAllowedOrigin('DELETE', new Headers(), origin)).toBe(false);
    expect(
      isAllowedOrigin('DELETE', new Headers({ 'sec-fetch-site': 'same-origin' }), origin),
    ).toBe(true);
  });
});
