import { z } from 'zod';
import { ENTRY_MAX_LENGTH, type SortEntryJob } from '@palanotes/core';
import { createEntry, type DbOrTx, type Entry } from '@palanotes/db';
import { RateLimiter } from './rate-limit';

// What an entry must be, whether typed in the app or sent by another app.
export const entryContent = z
  .string()
  .max(ENTRY_MAX_LENGTH)
  .refine((value) => value.trim().length > 0);

// Entries per account and per minute, whether typed in the app or sent with a token. Kept on
// globalThis so both routes share one count even when bundled apart.
const globalForEntries = globalThis as unknown as { palanotesEntryLimiter?: RateLimiter };

export function entryLimiter(): RateLimiter {
  globalForEntries.palanotesEntryLimiter ??= new RateLimiter(30, 60_000);
  return globalForEntries.palanotesEntryLimiter;
}

export type QueueSortEntry = (job: SortEntryJob) => Promise<void>;

// Stores the raw text and queues it for the worker, which files it.
export async function submitEntry(
  db: DbOrTx,
  userId: string,
  content: string,
  queue: QueueSortEntry,
): Promise<Entry> {
  const entry = await createEntry(db, userId, content);
  await queue({ entryId: entry.id });
  return entry;
}
