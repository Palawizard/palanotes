import { and, desc, eq, inArray, sql } from 'drizzle-orm';
import type { SortPlan } from '@palanotes/core';
import type { DbOrTx } from '../client';
import { sortRuns } from '../schema';

export type SortRun = typeof sortRuns.$inferSelect;
export type SortRunStatus = SortRun['status'];

export async function createSortRun(
  db: DbOrTx,
  input: {
    userId: string;
    entryId: string;
    plan: SortPlan;
    llmMode: SortRun['llmMode'];
    model: string;
    inputTokens: number | null;
    outputTokens: number | null;
  },
): Promise<SortRun> {
  const [run] = await db.insert(sortRuns).values(input).returning();
  if (!run) {
    throw new Error('sort run insert returned no row');
  }
  return run;
}

export async function findSortRun(
  db: DbOrTx,
  userId: string,
  runId: string,
): Promise<SortRun | null> {
  const [run] = await db
    .select()
    .from(sortRuns)
    .where(and(eq(sortRuns.id, runId), eq(sortRuns.userId, userId)))
    .limit(1);
  return run ?? null;
}

// Latest run of each entry, for the pocket.
export async function latestSortRuns(
  db: DbOrTx,
  userId: string,
  entryIds: readonly string[],
): Promise<Map<string, SortRun>> {
  if (entryIds.length === 0) {
    return new Map();
  }
  const rows = await db
    .selectDistinctOn([sortRuns.entryId])
    .from(sortRuns)
    .where(and(eq(sortRuns.userId, userId), inArray(sortRuns.entryId, [...entryIds])))
    .orderBy(sortRuns.entryId, desc(sortRuns.createdAt));
  return new Map(rows.map((run) => [run.entryId, run]));
}

export async function setSortRunStatus(
  db: DbOrTx,
  runId: string,
  status: SortRunStatus,
): Promise<void> {
  await db
    .update(sortRuns)
    .set({
      status,
      updatedAt: sql`now()`,
      ...(status === 'applied' ? { appliedAt: sql`now()` } : {}),
      ...(status === 'undone' ? { undoneAt: sql`now()` } : {}),
    })
    .where(eq(sortRuns.id, runId));
}
