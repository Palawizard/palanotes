import { OAuth2Server } from 'oauth2-mock-server';

export interface FakeIdentity {
  subject: string;
  name: string;
}

// A visitor whose browser carries this cookie signs in with the subject it holds: the
// end-to-end tests give each test its own account this way.
export const FAKE_SUBJECT_COOKIE = 'fake_oidc_subject';

function cookie(header: string | undefined, name: string): string | undefined {
  for (const part of header?.split(';') ?? []) {
    const [key, ...value] = part.trim().split('=');
    if (key === name) {
      return decodeURIComponent(value.join('='));
    }
  }
  return undefined;
}

// OIDC provider for this machine only: it has no sign-in page and gives every visitor
// the same identity, unless the visitor carries FAKE_SUBJECT_COOKIE. Used by the end-to-end
// tests and by `pnpm dev:local`.
export async function startFakeOidc(port: number, identity: FakeIdentity): Promise<OAuth2Server> {
  const server = new OAuth2Server();
  await server.issuer.keys.generate('RS256');
  const subjectByCode = new Map<string, string>();
  server.service.on('beforeAuthorizeRedirect', ({ url }, req) => {
    const subject = cookie(req.headers.cookie, FAKE_SUBJECT_COOKIE);
    const code = url.searchParams.get('code');
    if (subject && code) {
      subjectByCode.set(code, subject);
    }
  });
  server.service.on('beforeTokenSigning', (token, req) => {
    if (token.payload.aud) {
      const code = req.body.code;
      token.payload.sub = (code && subjectByCode.get(code)) || identity.subject;
      token.payload.name = identity.name;
    }
  });
  await server.start(port, 'localhost');
  return server;
}
