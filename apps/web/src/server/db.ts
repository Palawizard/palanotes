import { createDb, type Db } from '@palanotes/db';
import { getConfig } from './config';

const globalForDb = globalThis as unknown as { palanotesDb?: Db };

export function getDb(): Db {
  globalForDb.palanotesDb ??= createDb(getConfig().databaseUrl);
  return globalForDb.palanotesDb;
}
