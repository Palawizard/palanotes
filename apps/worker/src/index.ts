import { writeFile } from 'node:fs/promises';
import { PgBoss } from 'pg-boss';
import { QUEUES, TRASH_RETENTION_DAYS, type SortEntryJob } from '@palanotes/core';
import { createDb, listStalePendingEntryIds, purgeExpiredTrash } from '@palanotes/db';
import { createLlmClient, resolveLlmMode } from '@palanotes/llm';
import { readConfig } from './config';
import { sortEntry } from './sort-entry';

const SWEEP_INTERVAL_MS = 30_000;
const STALE_AFTER_MS = 30_000;
const PURGE_INTERVAL_MS = 60 * 60 * 1000;

const config = readConfig(process.env);
const db = createDb(config.databaseUrl, { max: 4 });
const boss = new PgBoss(config.databaseUrl);
boss.on('error', (error: Error) => console.error('[worker]', error.message));

await boss.start();
// stately + singletonKey: at most one queued and one active job per entry.
await boss.createQueue(QUEUES.sortEntry, { policy: 'stately', retryLimit: 2, retryDelay: 10 });

await boss.work<SortEntryJob>(QUEUES.sortEntry, async (jobs) => {
  for (const job of jobs) {
    await sortEntry(
      {
        db,
        clientFor: (user) =>
          createLlmClient(resolveLlmMode(user.authSubject, config.mode), config.llm),
      },
      job.data.entryId,
    );
  }
});

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

// Deleted folders stay in the trash for TRASH_RETENTION_DAYS days, then go for good.
async function purge(): Promise<void> {
  const removed = await purgeExpiredTrash(db, TRASH_RETENTION_DAYS);
  if (removed > 0) {
    console.log(`[worker] trash: ${removed} expired item(s) removed`);
  }
}
const purger = setInterval(() => {
  purge().catch((error: unknown) =>
    console.error('[worker] trash purge failed', error instanceof Error ? error.message : ''),
  );
}, PURGE_INTERVAL_MS);
await purge();

// The container health check reads the age of this file.
const heartbeatFile = process.env.WORKER_HEARTBEAT_FILE;
async function beat(): Promise<void> {
  if (heartbeatFile) {
    await db.execute('select 1');
    await writeFile(heartbeatFile, new Date().toISOString());
  }
}
await beat();
const heartbeat = setInterval(() => {
  beat().catch((error: unknown) =>
    console.error('[worker] heartbeat failed', error instanceof Error ? error.message : ''),
  );
}, 30_000);

console.log(`[worker] started${config.llm.fake ? ' with the fake model' : ''}`);

const stop = async (): Promise<void> => {
  clearInterval(sweeper);
  clearInterval(purger);
  clearInterval(heartbeat);
  await boss.stop({ graceful: true });
  await db.$client.end();
  process.exit(0);
};
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
