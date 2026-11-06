import { z } from 'zod';
import { ENTRY_MAX_LENGTH } from '@palanotes/core';
import { createEntry } from '@palanotes/db';
import { getCurrentUser } from '@/server/auth';
import { getDb } from '@/server/db';
import { loadPocket, toEntryView } from '@/server/entry-view';
import { queueSortEntry } from '@/server/queue';
import { RateLimiter } from '@/server/rate-limit';

export const dynamic = 'force-dynamic';

const body = z.object({
  content: z
    .string()
    .max(ENTRY_MAX_LENGTH)
    .refine((value) => value.trim().length > 0),
});

const limiter = new RateLimiter(30, 60_000);

export async function GET(): Promise<Response> {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ error: 'unauthorized' }, { status: 401 });
  }
  return Response.json({ entries: await loadPocket(getDb(), user.id) });
}

export async function POST(request: Request): Promise<Response> {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ error: 'unauthorized' }, { status: 401 });
  }
  if (!limiter.allow(user.id)) {
    return Response.json({ error: 'rate_limited' }, { status: 429 });
  }
  const parsed = body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    const tooLong = parsed.error.issues.some((issue) => issue.code === 'too_big');
    return Response.json({ error: tooLong ? 'too_long' : 'empty' }, { status: 400 });
  }
  const entry = await createEntry(getDb(), user.id, parsed.data.content);
  await queueSortEntry({ entryId: entry.id });
  return Response.json({ entry: toEntryView(entry) }, { status: 201 });
}
