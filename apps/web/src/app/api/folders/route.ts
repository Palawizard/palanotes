import { z } from 'zod';
import { createFolder } from '@palanotes/db';
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

const body = z.object({ name: folderName, parentId: z.uuid().nullable() });

export async function POST(request: Request): Promise<Response> {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ error: 'unauthorized' }, { status: 401 });
  }
  const parsed = body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return badRequest(NAME_MESSAGE);
  }
  try {
    const folder = await createFolder(getDb(), user.id, parsed.data.parentId, parsed.data.name);
    if (!folder) {
      return notFoundResponse();
    }
    return Response.json({ folder: { id: folder.id, name: folder.name } }, { status: 201 });
  } catch (error) {
    const response = folderErrorResponse(error);
    if (response) return response;
    throw error;
  }
}
