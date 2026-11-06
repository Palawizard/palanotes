// Copies the versioned hooks into .git/hooks. It does not change core.hooksPath,
// so a global hooks dispatcher that relays to .git/hooks keeps working.
import { copyFileSync, chmodSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';

let gitDir;
try {
  gitDir = execFileSync('git', ['rev-parse', '--git-common-dir'], { encoding: 'utf8' }).trim();
} catch {
  process.exit(0);
}
const target = join(gitDir, 'hooks');
if (!existsSync(target)) {
  mkdirSync(target, { recursive: true });
}
for (const hook of readdirSync('.githooks')) {
  const destination = join(target, hook);
  copyFileSync(join('.githooks', hook), destination);
  chmodSync(destination, 0o755);
}
