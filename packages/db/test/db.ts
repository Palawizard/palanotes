import { randomUUID } from 'node:crypto';
import { createDb, type Db } from '../src/client';
import { upsertUser, type User } from '../src/repo/users';

export const testDatabaseUrl =
  process.env.TEST_DATABASE_URL ?? 'postgres://palanotes:palanotes@localhost:5434/palanotes_test';

export function createTestDb(): Db {
  return createDb(testDatabaseUrl, { max: 4 });
}

export async function createTestUser(db: Db, name = 'Test'): Promise<User> {
  return upsertUser(db, { authSubject: `test-${randomUUID()}`, displayName: name });
}
