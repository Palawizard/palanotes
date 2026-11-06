// Account maintenance, run inside the worker container:
//   tsx src/accounts.ts list            one line per account: sub, name, notes, last activity
//   tsx src/accounts.ts delete <sub>    deletes the account and everything it owns
import { closeDb, createDb, deleteUserBySubject, listAccounts } from '@palanotes/db';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('DATABASE_URL is not set');
  process.exit(1);
}
const [command, subject] = process.argv.slice(2);
const db = createDb(databaseUrl, { max: 1 });

try {
  if (command === 'list') {
    for (const account of await listAccounts(db)) {
      console.log(
        [
          account.authSubject,
          account.displayName,
          account.noteCount,
          account.lastActivity.toISOString(),
        ].join('\t'),
      );
    }
  } else if (command === 'delete' && subject) {
    const deleted = await deleteUserBySubject(db, subject);
    console.log(deleted ? `deleted ${subject}` : `no account for ${subject}`);
  } else {
    console.error('usage: accounts.ts list | accounts.ts delete <oidc sub>');
    process.exitCode = 2;
  }
} finally {
  await closeDb(db);
}
