import postgres from 'postgres';
import { runMigrations } from '../src/migrate';
import { testDatabaseUrl } from './db';

export default async function setup(): Promise<void> {
  const sql = postgres(testDatabaseUrl, { max: 1, onnotice: () => undefined });
  await sql.unsafe(
    'drop schema if exists public cascade; drop schema if exists drizzle cascade; create schema public;',
  );
  await sql.end();
  await runMigrations(testDatabaseUrl);
}
