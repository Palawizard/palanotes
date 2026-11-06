// Started by Playwright before the app: resets the e2e database, runs a fake OIDC provider
// that signs everyone in as the e2e owner, and starts the worker with the fake model.
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { OAuth2Server } from 'oauth2-mock-server';
import postgres from 'postgres';
import { runMigrations } from '@palanotes/db/migrate';
import { E2E_OIDC_PORT, E2E_SUBJECT, e2eEnv } from './env';

const url = e2eEnv.DATABASE_URL ?? '';
const sql = postgres(url, { max: 1, onnotice: () => undefined });
await sql.unsafe(
  'drop schema if exists public cascade; drop schema if exists drizzle cascade; drop schema if exists pgboss cascade; create schema public;',
);
await sql.end();
await runMigrations(url);

const server = new OAuth2Server();
await server.issuer.keys.generate('RS256');
server.service.on('beforeTokenSigning', (token) => {
  if (token.payload.aud) {
    token.payload.sub = E2E_SUBJECT;
    token.payload.name = 'Palawi';
  }
});
await server.start(E2E_OIDC_PORT, 'localhost');
console.log(`[e2e] fake OIDC provider on ${server.issuer.url}`);

const workerDir = fileURLToPath(new URL('../../worker', import.meta.url));
const tsx = createRequire(import.meta.url).resolve('tsx/cli');
const worker = spawn(process.execPath, [tsx, 'src/index.ts'], {
  cwd: workerDir,
  env: { ...process.env, LLM_FAKE: '1' },
  stdio: 'inherit',
});
process.on('exit', () => worker.kill('SIGTERM'));
const stop = (): void => {
  worker.kill('SIGTERM');
  process.exit(0);
};
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
