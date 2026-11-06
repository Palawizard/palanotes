import type { NextConfig } from 'next';

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
