import * as client from 'openid-client';
import type { AppConfig } from './config';

let configuration: Promise<client.Configuration> | null = null;

function isLocalIssuer(issuer: URL): boolean {
  return issuer.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(issuer.hostname);
}

export function getOidcConfiguration(config: AppConfig): Promise<client.Configuration> {
  if (!configuration) {
    const issuer = new URL(config.oidc.issuer);
    configuration = client
      .discovery(
        issuer,
        config.oidc.clientId,
        config.oidc.clientSecret,
        client.ClientSecretBasic(config.oidc.clientSecret),
        // Plain http is accepted only for a provider on this machine (tests).
        isLocalIssuer(issuer) ? { execute: [client.allowInsecureRequests] } : undefined,
      )
      .catch((error: unknown) => {
        configuration = null;
        throw error;
      });
  }
  return configuration;
}

export interface LoginStart {
  url: URL;
  codeVerifier: string;
  state: string;
  nonce: string;
}

export async function startLogin(config: AppConfig): Promise<LoginStart> {
  const oidc = await getOidcConfiguration(config);
  const codeVerifier = client.randomPKCECodeVerifier();
  const state = client.randomState();
  const nonce = client.randomNonce();
  const url = client.buildAuthorizationUrl(oidc, {
    redirect_uri: config.oidc.redirectUri,
    scope: 'openid profile',
    code_challenge: await client.calculatePKCECodeChallenge(codeVerifier),
    code_challenge_method: 'S256',
    state,
    nonce,
  });
  return { url, codeVerifier, state, nonce };
}

export interface SignedInIdentity {
  subject: string;
  displayName: string;
}

export async function finishLogin(
  config: AppConfig,
  searchParams: URLSearchParams,
  checks: { codeVerifier: string; state: string; nonce: string },
): Promise<SignedInIdentity> {
  const oidc = await getOidcConfiguration(config);
  // Rebuilt from the configured redirect URI: behind the reverse proxy the request URL
  // is internal, and the token endpoint requires the exact redirect_uri.
  const currentUrl = new URL(config.oidc.redirectUri);
  currentUrl.search = searchParams.toString();
  const tokens = await client.authorizationCodeGrant(oidc, currentUrl, {
    pkceCodeVerifier: checks.codeVerifier,
    expectedState: checks.state,
    expectedNonce: checks.nonce,
    idTokenExpected: true,
  });
  const claims = tokens.claims();
  if (!claims?.sub) {
    throw new Error('id token has no subject');
  }
  const name = [claims.name, claims.preferred_username].find(
    (value): value is string => typeof value === 'string' && value.trim().length > 0,
  );
  return { subject: claims.sub, displayName: name?.trim() ?? 'Moi' };
}
