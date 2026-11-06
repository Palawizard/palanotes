import { z } from 'zod';
import { setSortMode } from '@palanotes/db';
import { getCurrentUser } from '@/server/auth';
import { getDb } from '@/server/db';

export const dynamic = 'force-dynamic';

const body = z.object({ sortMode: z.enum(['review', 'direct']) });

export async function PATCH(request: Request): Promise<Response> {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ error: 'unauthorized' }, { status: 401 });
  }
  const parsed = body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: 'bad_request' }, { status: 400 });
  }
  await setSortMode(getDb(), user.id, parsed.data.sortMode);
  return Response.json({ sortMode: parsed.data.sortMode });
}
