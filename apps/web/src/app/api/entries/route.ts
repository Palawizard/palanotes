import { z } from 'zod';
import { ENTRY_MAX_LENGTH } from '@palanotes/core';
import { createEntry } from '@palanotes/db';
import { getCurrentUser } from '@/server/auth';
import { getConfig } from '@/server/config';
import { getDb } from '@/server/db';
import { loadPocket, toEntryView } from '@/server/entry-view';
import { queueSortEntry } from '@/server/queue';
import { RateLimiter } from '@/server/rate-limit';
import { appUrl } from '@/server/urls';

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

async function readBody(request: Request): Promise<{ input: unknown; fromForm: boolean }> {
  const type = request.headers.get('content-type') ?? '';
  if (type.includes('application/x-www-form-urlencoded') || type.includes('multipart/form-data')) {
    const form = await request.formData().catch(() => null);
    return { input: { content: form?.get('content') }, fromForm: true };
  }
  return { input: await request.json().catch(() => null), fromForm: false };
}

export async function POST(request: Request): Promise<Response> {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ error: 'unauthorized' }, { status: 401 });
  }
  if (!limiter.allow(user.id)) {
    return Response.json({ error: 'rate_limited' }, { status: 429 });
  }
  const { input, fromForm } = await readBody(request);
  const parsed = body.safeParse(input);
  if (!parsed.success) {
    const tooLong = parsed.error.issues.some((issue) => issue.code === 'too_big');
    return Response.json({ error: tooLong ? 'too_long' : 'empty' }, { status: 400 });
  }
  const entry = await createEntry(getDb(), user.id, parsed.data.content);
  await queueSortEntry({ entryId: entry.id });
  if (fromForm) {
    // Plain form post (script not loaded yet): back to the writing page.
    return Response.redirect(appUrl(getConfig(), '/'), 303);
  }
  return Response.json({ entry: toEntryView(entry) }, { status: 201 });
}
