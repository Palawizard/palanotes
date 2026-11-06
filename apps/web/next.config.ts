import type { NextConfig } from 'next';

const config: NextConfig = {
  basePath: process.env.BASE_PATH ?? '/notes',
  output: 'standalone',
  transpilePackages: ['@palanotes/core', '@palanotes/db', '@palanotes/llm'],
  poweredByHeader: false,
  // The repository is public: no generated agent instruction files.
  agentRules: false,
};

export default config;
