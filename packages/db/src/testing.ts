import { randomUUID } from 'node:crypto';
import postgres from 'postgres';
import { createDb, type Db } from './client';
import { runMigrations } from './migrate';
import { upsertUser, type User } from './repo/users';

const serverUrl =
  process.env.TEST_DATABASE_URL ?? 'postgres://palanotes:palanotes@localhost:5434/palanotes_test';

// Each package gets its own database, because `pnpm -r test` runs packages in parallel.
export function testDatabaseUrl(name: string): string {
  const url = new URL(serverUrl);
  url.pathname = `/${name}`;
  return url.toString();
}

export async function prepareTestDatabase(name: string): Promise<void> {
  if (!/^[a-z_]+$/.test(name)) {
    throw new Error('test database name must be lowercase letters and underscores');
  }
  const admin = postgres(serverUrl, { max: 1, onnotice: () => undefined });
  const [exists] = await admin`select 1 from pg_database where datname = ${name}`;
  if (!exists) {
    await admin.unsafe(`create database ${name}`);
  }
  await admin.end();

  const url = testDatabaseUrl(name);
  const sql = postgres(url, { max: 1, onnotice: () => undefined });
  await sql.unsafe(
    'drop schema if exists public cascade; drop schema if exists drizzle cascade; create schema public;',
  );
  await sql.end();
  await runMigrations(url);
}

export function createTestDb(name: string): Db {
  return createDb(testDatabaseUrl(name), { max: 4 });
}

export async function createTestUser(db: Db, name = 'Test'): Promise<User> {
  return upsertUser(db, { authSubject: `test-${randomUUID()}`, displayName: name });
}
