import { z } from 'zod';
import { restoreTrashItem } from '@palanotes/db';
import { getCurrentUser } from '@/server/auth';
import { getDb } from '@/server/db';
import { trashNotFoundResponse } from '@/server/trash-errors';

export const dynamic = 'force-dynamic';

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ error: 'unauthorized' }, { status: 401 });
  }
  const id = z.uuid().safeParse((await context.params).id);
  if (!id.success) {
    return trashNotFoundResponse();
  }
  const folder = await restoreTrashItem(getDb(), user.id, id.data);
  if (!folder) {
    return trashNotFoundResponse();
  }
  return Response.json({ folder });
}
