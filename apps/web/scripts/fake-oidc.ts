import { OAuth2Server } from 'oauth2-mock-server';

export interface FakeIdentity {
  subject: string;
  name: string;
}

// OIDC provider for this machine only: it has no sign-in page and gives every visitor
// the same identity. Used by the end-to-end tests and by `pnpm dev:local`.
export async function startFakeOidc(port: number, identity: FakeIdentity): Promise<OAuth2Server> {
  const server = new OAuth2Server();
  await server.issuer.keys.generate('RS256');
  server.service.on('beforeTokenSigning', (token) => {
    if (token.payload.aud) {
      token.payload.sub = identity.subject;
      token.payload.name = identity.name;
    }
  });
  await server.start(port, 'localhost');
  return server;
}
