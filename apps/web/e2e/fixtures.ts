import { test as base, expect, type BrowserContext } from '@playwright/test';
import { closeDb, createDb, upsertUser, type Db } from '@palanotes/db';
import { seedDemoAccount } from '@palanotes/db/demo';
import { FAKE_SUBJECT_COOKIE } from '../scripts/fake-oidc';
import { E2E_OIDC_PORT, e2eEnv } from './env';

export interface E2eAccount {
  id: string;
  subject: string;
}

// The fake OIDC provider signs a browser in with the subject of this cookie.
export async function signInAs(context: BrowserContext, account: E2eAccount): Promise<void> {
  await context.addCookies([
    { name: FAKE_SUBJECT_COOKIE, value: account.subject, url: `http://localhost:${E2E_OIDC_PORT}` },
  ]);
}

// Every test signs in with an account of its own, seeded with the demo data (about 0.2 s), so
// tests never see what another test, a repeat or a retry left behind, and all run in parallel.
export const test = base.extend<{ account: E2eAccount }, { accountsDb: Db }>({
  accountsDb: [
    async ({}, provide) => {
      const db = createDb(e2eEnv.DATABASE_URL ?? '', { max: 1 });
      await provide(db);
      await closeDb(db);
    },
    { scope: 'worker' },
  ],
  account: async ({ accountsDb }, provide, testInfo) => {
    const subject = `e2e-${testInfo.testId}-${testInfo.repeatEachIndex}-${testInfo.retry}`;
    const user = await upsertUser(accountsDb, { authSubject: subject, displayName: 'Palawi' });
    await seedDemoAccount(accountsDb, user.id);
    await provide({ id: user.id, subject });
  },
  context: async ({ context, account }, provide) => {
    await signInAs(context, account);
    await provide(context);
  },
});

export { expect };
