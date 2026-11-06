import { z } from 'zod';
import { deleteTrashItem } from '@palanotes/db';
import { getCurrentUser } from '@/server/auth';
import { getDb } from '@/server/db';
import { trashNotFoundResponse } from '@/server/trash-errors';

export const dynamic = 'force-dynamic';

// Deletes one item of the trash for good.
export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ error: 'unauthorized' }, { status: 401 });
  }
  const id = z.uuid().safeParse((await context.params).id);
  if (!id.success || !(await deleteTrashItem(getDb(), user.id, id.data))) {
    return trashNotFoundResponse();
  }
  return new Response(null, { status: 204 });
}
