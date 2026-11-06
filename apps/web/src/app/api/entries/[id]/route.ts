import { z } from 'zod';
import {
  applySortRun,
  FilingError,
  findEntry,
  latestSortRuns,
  prepareRetry,
  rejectSortRun,
  undoSortRun,
} from '@palanotes/db';
import { getCurrentUser } from '@/server/auth';
import { getDb } from '@/server/db';
import { loadPocket } from '@/server/entry-view';
import { queueSortEntry } from '@/server/queue';

export const dynamic = 'force-dynamic';

const body = z.object({ action: z.enum(['accept', 'reject', 'retry', 'undo']) });
const id = z.uuid();

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ error: 'unauthorized' }, { status: 401 });
  }
  const entryId = id.safeParse((await context.params).id);
  const parsed = body.safeParse(await request.json().catch(() => null));
  if (!entryId.success || !parsed.success) {
    return Response.json({ error: 'bad_request' }, { status: 400 });
  }
  const db = getDb();
  const entry = await findEntry(db, user.id, entryId.data);
  if (!entry) {
    return Response.json({ error: 'not_found' }, { status: 404 });
  }

  try {
    if (parsed.data.action === 'retry') {
      await prepareRetry(db, user.id, entry.id);
      await queueSortEntry({ entryId: entry.id });
    } else {
      const run = (await latestSortRuns(db, user.id, [entry.id])).get(entry.id);
      if (!run) {
        return Response.json({ error: 'not_found' }, { status: 404 });
      }
      if (parsed.data.action === 'accept') {
        await applySortRun(db, user.id, run.id);
      } else if (parsed.data.action === 'reject') {
        await rejectSortRun(db, user.id, run.id);
      } else {
        await undoSortRun(db, user.id, run.id);
      }
    }
  } catch (error) {
    if (error instanceof FilingError) {
      return Response.json({ error: 'conflict', message: error.userMessage }, { status: 409 });
    }
    throw error;
  }
  return Response.json({ entries: await loadPocket(db, user.id) });
}
