import { PgBoss } from 'pg-boss';
import { QUEUES } from '@palanotes/core';
import { createDb, listStalePendingEntryIds } from '@palanotes/db';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error('DATABASE_URL is not set');
}

const SWEEP_INTERVAL_MS = 30_000;
const STALE_AFTER_MS = 30_000;

const db = createDb(databaseUrl, { max: 4 });
const boss = new PgBoss(databaseUrl);
boss.on('error', (error: Error) => console.error('[worker]', error.message));

await boss.start();
// stately + singletonKey: at most one queued and one active job per entry.
await boss.createQueue(QUEUES.sortEntry, { policy: 'stately', retryLimit: 2, retryDelay: 10 });

// Requeues entries whose job was never sent (web restarted, queue briefly down).
async function sweep(): Promise<void> {
  const ids = await listStalePendingEntryIds(db, new Date(Date.now() - STALE_AFTER_MS));
  for (const entryId of ids) {
    await boss.send(QUEUES.sortEntry, { entryId }, { singletonKey: entryId });
  }
}
const sweeper = setInterval(() => {
  sweep().catch((error: unknown) =>
    console.error('[worker] sweep failed', error instanceof Error ? error.message : ''),
  );
}, SWEEP_INTERVAL_MS);

console.log('[worker] started');

const stop = async (): Promise<void> => {
  clearInterval(sweeper);
  await boss.stop({ graceful: true });
  await db.$client.end();
  process.exit(0);
};
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
