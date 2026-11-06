import { z } from 'zod';
import { FolderNameTakenError, renameFolder } from '@palanotes/db';
import { getCurrentUser } from '@/server/auth';
import { getDb } from '@/server/db';

export const dynamic = 'force-dynamic';

const body = z.object({
  name: z
    .string()
    .trim()
    .min(1)
    .max(80)
    .refine((value) => !value.includes('/'), 'no slash'),
});

export async function PATCH(
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
    return Response.json(
      { error: 'bad_request', message: 'Nom invalide : 80 caractères au plus, sans « / ».' },
      { status: 400 },
    );
  }
  try {
    const folder = await renameFolder(getDb(), user.id, id.data, parsed.data.name);
    if (!folder) {
      return Response.json({ error: 'not_found' }, { status: 404 });
    }
    return Response.json({ folder: { id: folder.id, name: folder.name } });
  } catch (error) {
    if (error instanceof FolderNameTakenError) {
      return Response.json(
        { error: 'conflict', message: 'Un dossier porte déjà ce nom ici.' },
        { status: 409 },
      );
    }
    throw error;
  }
}
