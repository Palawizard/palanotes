import { defineConfig, devices } from '@playwright/test';
import { E2E_OIDC_PORT, E2E_PORT, e2eEnv } from './e2e/env';

export default defineConfig({
  testDir: './e2e',
  testIgnore: ['screens/**'],
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: `http://localhost:${E2E_PORT}/notes/`,
    trace: 'off',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      command: 'tsx e2e/test-servers.ts',
      url: `http://localhost:${E2E_OIDC_PORT}/.well-known/openid-configuration`,
      reuseExistingServer: false,
      env: e2eEnv,
    },
    {
      // A production build: closer to what ships, and free of the dev server's hot reload.
      command: `node e2e/start-app.mjs ${E2E_PORT}`,
      url: `http://localhost:${E2E_PORT}/notes/api/health`,
      reuseExistingServer: false,
      timeout: 300_000,
      env: e2eEnv,
    },
  ],
});
