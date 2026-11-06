import { and, desc, eq, lt, sql } from 'drizzle-orm';
import type { DbOrTx } from '../client';
import { entries } from '../schema';

export type Entry = typeof entries.$inferSelect;
export type EntryStatus = Entry['status'];

export async function createEntry(db: DbOrTx, userId: string, content: string): Promise<Entry> {
  const [entry] = await db.insert(entries).values({ userId, content }).returning();
  if (!entry) {
    throw new Error('entry insert returned no row');
  }
  return entry;
}

export async function listRecentEntries(db: DbOrTx, userId: string, limit = 20): Promise<Entry[]> {
  return db
    .select()
    .from(entries)
    .where(eq(entries.userId, userId))
    .orderBy(desc(entries.createdAt))
    .limit(limit);
}

export async function findEntry(
  db: DbOrTx,
  userId: string,
  entryId: string,
): Promise<Entry | null> {
  const [entry] = await db
    .select()
    .from(entries)
    .where(and(eq(entries.id, entryId), eq(entries.userId, userId)))
    .limit(1);
  return entry ?? null;
}

// The worker reads entries by id only: the id comes from our own queue, never from a request.
export async function findEntryById(db: DbOrTx, entryId: string): Promise<Entry | null> {
  const [entry] = await db.select().from(entries).where(eq(entries.id, entryId)).limit(1);
  return entry ?? null;
}

export async function setEntryStatus(
  db: DbOrTx,
  entryId: string,
  status: EntryStatus,
  error: string | null = null,
): Promise<void> {
  await db
    .update(entries)
    .set({ status, error, updatedAt: sql`now()` })
    .where(eq(entries.id, entryId));
}

export async function listStalePendingEntryIds(db: DbOrTx, olderThan: Date): Promise<string[]> {
  const rows = await db
    .select({ id: entries.id })
    .from(entries)
    .where(and(eq(entries.status, 'pending'), lt(entries.createdAt, olderThan)))
    .limit(100);
  return rows.map((row) => row.id);
}
