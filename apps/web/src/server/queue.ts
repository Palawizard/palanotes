import 'server-only';
import { PgBoss } from 'pg-boss';
import { QUEUES, type SortEntryJob } from '@palanotes/core';
import { getConfig } from './config';

const globalForBoss = globalThis as unknown as { palanotesBoss?: Promise<PgBoss> };

// The web app only sends jobs: maintenance, scheduling and migrations belong to the worker.
function getBoss(): Promise<PgBoss> {
  globalForBoss.palanotesBoss ??= (async () => {
    const boss = new PgBoss({
      connectionString: getConfig().databaseUrl,
      max: 2,
      supervise: false,
      schedule: false,
      migrate: false,
    });
    boss.on('error', (error: Error) => console.error('[queue]', error.message));
    await boss.start();
    return boss;
  })().catch((error: unknown) => {
    globalForBoss.palanotesBoss = undefined;
    throw error;
  });
  return globalForBoss.palanotesBoss;
}

// A failed send is not fatal: the entry stays pending and the worker picks it up on its sweep.
export async function queueSortEntry(job: SortEntryJob): Promise<void> {
  try {
    const boss = await getBoss();
    await boss.send(QUEUES.sortEntry, job, { singletonKey: job.entryId });
  } catch (error) {
    console.error(
      '[queue] could not queue entry',
      job.entryId,
      error instanceof Error ? error.message : '',
    );
  }
}
