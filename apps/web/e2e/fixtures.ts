import { test as base, expect, type BrowserContext } from '@playwright/test';
import { closeDb, createDb, upsertUser } from '@palanotes/db';
import { DemoAccountNotEmptyError, seedDemoAccount } from '@palanotes/db/demo';
import { FAKE_SUBJECT_COOKIE } from '../scripts/fake-oidc';
import { E2E_OIDC_PORT, e2eEnv, workerSubject } from './env';

export interface E2eAccount {
  id: string;
  subject: string;
}

// One account per parallel worker, each with its own copy of the demo account, so tests that
// change notes or folders never share data and the suite can use every worker. A restarted
// worker keeps its parallelIndex and finds its account already seeded.
async function ensureAccount(subject: string): Promise<E2eAccount> {
  const db = createDb(e2eEnv.DATABASE_URL ?? '', { max: 1 });
  try {
    const user = await upsertUser(db, { authSubject: subject, displayName: 'Palawi' });
    try {
      await seedDemoAccount(db, user.id);
    } catch (error) {
      if (!(error instanceof DemoAccountNotEmptyError)) throw error;
    }
    return { id: user.id, subject };
  } finally {
    await closeDb(db);
  }
}

// The fake OIDC provider signs a browser in with the subject of this cookie.
export async function signInAs(context: BrowserContext, account: E2eAccount): Promise<void> {
  await context.addCookies([
    { name: FAKE_SUBJECT_COOKIE, value: account.subject, url: `http://localhost:${E2E_OIDC_PORT}` },
  ]);
}

export const test = base.extend<object, { account: E2eAccount }>({
  account: [
    async ({}, provide, workerInfo) => {
      await provide(await ensureAccount(workerSubject(workerInfo.parallelIndex)));
    },
    { scope: 'worker' },
  ],
  context: async ({ context, account }, provide) => {
    await signInAs(context, account);
    await provide(context);
  },
});

export { expect };
