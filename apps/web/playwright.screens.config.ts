import { defineConfig } from '@playwright/test';
import base from './playwright.config';

// Screenshots of every screen with the demo account: `pnpm --filter @palanotes/web screens`.
// Files go to SCREENS_DIR (default test-results/screens), never into the repository.
export default defineConfig({
  ...base,
  testDir: './e2e/screens',
  testIgnore: [],
  timeout: 300_000,
  retries: 0,
  // The performance pass measures the screens: it must not share the machine with the screenshots.
  workers: 1,
  projects: [{ name: 'screens', use: { browserName: 'chromium' } }],
});
