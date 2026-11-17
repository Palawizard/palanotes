// `pnpm dev:local`: runs the whole app on this machine without Authentik. A fake OIDC
// provider signs every visitor in as one local account, then the web app and the worker
// start in watch mode. Values from the root .env are used, except the sign-in settings,
// which always point to the fake provider.
import { spawn, type ChildProcess } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { runMigrations } from '@palanotes/db/migrate';
import { startFakeOidc } from './fake-oidc';

if (process.env.NODE_ENV === 'production') {
  console.error('[dev] refused: NODE_ENV is production');
  process.exit(1);
}

for (const file of ['.env', '.env.worker']) {
  const path = new URL(`../../../${file}`, import.meta.url);
  if (existsSync(path)) {
    process.loadEnvFile(path);
  }
}

const env = process.env;
const port = env.PORT || '3000';
const oidcPort = Number(env.DEV_OIDC_PORT || 9401);
const basePath = env.BASE_PATH ?? '/notes';
const publicUrl = `http://localhost:${port}`;
const subject = env.LLM_OWNER_SUBJECT || 'local-dev-user';
const ownerMode = env.LLM_OWNER_MODE || 'subscription';
const hasModel =
  (ownerMode === 'subscription' && Boolean(env.CLAUDE_CODE_OAUTH_TOKEN)) ||
  (ownerMode === 'api' && Boolean(env.ANTHROPIC_API_KEY));
const fakeModel = env.LLM_FAKE === '1' || !hasModel;

const appEnv: NodeJS.ProcessEnv = {
  ...env,
  DATABASE_URL: env.DATABASE_URL || 'postgres://palanotes:palanotes@localhost:5434/palanotes',
  PUBLIC_URL: publicUrl,
  BASE_PATH: basePath,
  // Random when unset: a restart then signs out, and the fake provider signs back in at once.
  SESSION_SECRET: env.SESSION_SECRET || randomBytes(32).toString('hex'),
  OIDC_ISSUER: `http://localhost:${oidcPort}`,
  // Letters only: the fake provider does not decode the escaped client id of Basic auth.
  OIDC_CLIENT_ID: 'palanotes',
  OIDC_CLIENT_SECRET: 'local',
  OIDC_REDIRECT_URI: `${publicUrl}${basePath}/api/auth/callback`,
  // The local account is the owner, so it gets the owner's model mode.
  LLM_OWNER_SUBJECT: subject,
  LLM_FAKE: fakeModel ? '1' : '0',
};

try {
  await runMigrations(appEnv.DATABASE_URL ?? '');
} catch (error) {
  const reason = error instanceof Error ? error.message : String(error);
  console.error(`[dev] database unreachable (${reason}). Start it with \`pnpm db:up\`.`);
  process.exit(1);
}

const oidc = await startFakeOidc(oidcPort, { subject, name: 'Compte local' });

const require = createRequire(import.meta.url);
const children: ChildProcess[] = [];
function run(script: string, args: string[], cwd: URL): void {
  const child = spawn(process.execPath, [script, ...args], {
    cwd: fileURLToPath(cwd),
    env: appEnv,
    stdio: 'inherit',
  });
  child.on('exit', (code) => stop(code ?? 0));
  children.push(child);
}

let stopping = false;
function stop(code = 0): void {
  if (stopping) {
    return;
  }
  stopping = true;
  for (const child of children) {
    child.kill('SIGTERM');
  }
  void oidc.stop().finally(() => process.exit(code));
}
process.on('SIGINT', () => stop());
process.on('SIGTERM', () => stop());

run(
  require.resolve('next/dist/bin/next'),
  ['dev', '--hostname', 'localhost', '--port', port],
  new URL('..', import.meta.url),
);
run(
  require.resolve('tsx/cli'),
  ['watch', 'src/index.ts'],
  new URL('../../worker/', import.meta.url),
);

console.log(
  `[dev] ${publicUrl}${basePath} signed in as "${subject}", ${fakeModel ? 'fake model' : `model mode ${ownerMode}`}`,
);
