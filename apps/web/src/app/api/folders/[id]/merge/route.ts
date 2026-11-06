import { z } from 'zod';
import { mergeFolder } from '@palanotes/db';
import { getCurrentUser } from '@/server/auth';
import { getDb } from '@/server/db';
import { badRequest, folderErrorResponse, notFoundResponse } from '@/server/folder-errors';

export const dynamic = 'force-dynamic';

const body = z.object({ targetId: z.uuid() });

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ error: 'unauthorized' }, { status: 401 });
  }
  const id = z.uuid().safeParse((await context.params).id);
  const parsed = body.safeParse(await request.json().catch(() => null));
  if (!id.success || !parsed.success) {
    return badRequest('Choisis le dossier dans lequel fusionner.');
  }
  try {
    const result = await mergeFolder(getDb(), user.id, id.data, parsed.data.targetId);
    if (!result) {
      return notFoundResponse();
    }
    return Response.json(result);
  } catch (error) {
    const response = folderErrorResponse(error);
    if (response) return response;
    throw error;
  }
}
