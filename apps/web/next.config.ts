import { existsSync } from 'node:fs';
import type { NextConfig } from 'next';

// Next only reads .env files from apps/web; the shared one is at the repository root.
// Variables already set (compose, `pnpm dev:local`) win over the file.
const rootEnv = new URL('../../.env', import.meta.url);
if (existsSync(rootEnv)) {
  process.loadEnvFile(rootEnv);
}

const basePath = process.env.BASE_PATH ?? '/notes';

const config: NextConfig = {
  basePath,
  env: { NEXT_PUBLIC_BASE_PATH: basePath },
  output: 'standalone',
  transpilePackages: ['@palanotes/core', '@palanotes/db', '@palanotes/llm'],
  poweredByHeader: false,
  // The repository is public: no generated agent instruction files.
  agentRules: false,
};

export default config;
