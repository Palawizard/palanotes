import { PgBoss } from 'pg-boss';
import { QUEUES } from './queues';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error('DATABASE_URL is not set');
}

const boss = new PgBoss(databaseUrl);
boss.on('error', (error: Error) => console.error('[worker]', error));

await boss.start();
await boss.createQueue(QUEUES.sortEntry);
console.log('[worker] started');

const stop = async (): Promise<void> => {
  await boss.stop({ graceful: true });
  process.exit(0);
};
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
