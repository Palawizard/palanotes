// Builds the app, then runs `next start` in this process group (no pnpm wrapper), so that
// stopping the test run stops the server too.
import { execFileSync, spawn } from 'node:child_process';
import { createRequire } from 'node:module';

const port = process.argv[2] ?? '3100';
const next = createRequire(import.meta.url).resolve('next/dist/bin/next');
execFileSync(process.execPath, [next, 'build'], { stdio: 'inherit' });
const server = spawn(process.execPath, [next, 'start', '--port', port], { stdio: 'inherit' });

const stop = () => {
  server.kill('SIGTERM');
  process.exit(0);
};
process.on('SIGTERM', stop);
process.on('SIGINT', stop);
process.on('exit', () => server.kill('SIGTERM'));
server.on('exit', (code) => process.exit(code ?? 0));
