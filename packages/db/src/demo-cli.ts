import { parseArgs } from 'node:util';
import { closeDb, createDb } from './client';
import { DemoAccountNotEmptyError, seedDemoAccount } from './demo';
import { upsertUser } from './repo/users';

// Loads the demo account into a local database: `pnpm db:demo --subject <sub>`.
// Refused in production; the demo folder is also left out of the Docker images.
if (process.env.NODE_ENV === 'production') {
  console.error('[demo] refused: NODE_ENV is production');
  process.exit(1);
}
const { values } = parseArgs({
  options: { subject: { type: 'string' }, name: { type: 'string', default: 'Palawi' } },
});
const url = process.env.DATABASE_URL;
if (!url || !values.subject) {
  console.error(
    'usage: DATABASE_URL=... pnpm db:demo --subject <oidc sub> [--name <display name>]',
  );
  process.exit(1);
}
const db = createDb(url, { max: 2 });
try {
  const user = await upsertUser(db, { authSubject: values.subject, displayName: values.name });
  const summary = await seedDemoAccount(db, user.id);
  console.log(
    `[demo] ${summary.folders} folders, ${summary.notes} notes and ${summary.entries} entries loaded`,
  );
} catch (error) {
  if (error instanceof DemoAccountNotEmptyError) {
    console.error(`[demo] refused: ${error.message}`);
    process.exitCode = 1;
  } else {
    throw error;
  }
} finally {
  await closeDb(db);
}
