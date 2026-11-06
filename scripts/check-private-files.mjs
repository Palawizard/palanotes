// Usage: node scripts/check-private-files.mjs [--staged]
// Without --staged, checks every tracked file (CI). With --staged, checks the files being committed.
import { execFileSync } from 'node:child_process';
import { isPrivatePath } from './private-files.mjs';

const staged = process.argv.includes('--staged');
const args = staged
  ? ['diff', '--cached', '--name-only', '--diff-filter=ACR', '-z']
  : ['ls-files', '-z'];
const files = execFileSync('git', args, { encoding: 'utf8' }).split('\0').filter(Boolean);
const offending = files.filter(isPrivatePath);

if (offending.length > 0) {
  console.error('These files must not be committed to this public repository:');
  for (const file of offending) {
    console.error(`  ${file}`);
  }
  process.exit(1);
}
