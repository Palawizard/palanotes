import { z } from 'zod';
import { deleteEmptyFolder, moveFolder, renameFolder } from '@palanotes/db';
import { getCurrentUser } from '@/server/auth';
import { getDb } from '@/server/db';
import {
  badRequest,
  folderErrorResponse,
  folderName,
  NAME_MESSAGE,
  notFoundResponse,
} from '@/server/folder-errors';

export const dynamic = 'force-dynamic';

const body = z.union([
  z.object({ name: folderName }).strict(),
  z.object({ parentId: z.uuid().nullable() }).strict(),
]);

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: Context): Promise<Response> {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ error: 'unauthorized' }, { status: 401 });
  }
  const id = z.uuid().safeParse((await context.params).id);
  const parsed = body.safeParse(await request.json().catch(() => null));
  if (!id.success || !parsed.success) {
    return badRequest(NAME_MESSAGE);
  }
  const db = getDb();
  try {
    const folder =
      'name' in parsed.data
        ? await renameFolder(db, user.id, id.data, parsed.data.name)
        : await moveFolder(db, user.id, id.data, parsed.data.parentId);
    if (!folder) {
      return notFoundResponse();
    }
    return Response.json({
      folder: { id: folder.id, name: folder.name, parentId: folder.parentId },
    });
  } catch (error) {
    const response = folderErrorResponse(error);
    if (response) return response;
    throw error;
  }
}

export async function DELETE(_request: Request, context: Context): Promise<Response> {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ error: 'unauthorized' }, { status: 401 });
  }
  const id = z.uuid().safeParse((await context.params).id);
  if (!id.success) {
    return notFoundResponse();
  }
  try {
    return (await deleteEmptyFolder(getDb(), user.id, id.data))
      ? new Response(null, { status: 204 })
      : notFoundResponse();
  } catch (error) {
    const response = folderErrorResponse(error);
    if (response) return response;
    throw error;
  }
}
