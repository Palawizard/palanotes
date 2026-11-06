import { sql } from 'drizzle-orm';
import { getDb } from '@/server/db';

export const dynamic = 'force-dynamic';

// Public, for the uptime monitor: 200 when the database answers, 503 otherwise.
export async function GET(): Promise<Response> {
  try {
    await Promise.race([
      getDb().execute(sql`select 1`),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000)),
    ]);
    return Response.json({ status: 'ok' });
  } catch {
    return Response.json({ status: 'unavailable' }, { status: 503 });
  }
}
