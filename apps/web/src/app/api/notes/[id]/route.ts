import { z } from 'zod';
import { parseFolderPath } from '@palanotes/core';
import { ensureFolderPath, trashNote, updateNote, type NoteChanges } from '@palanotes/db';
import { getCurrentUser } from '@/server/auth';
import { getDb } from '@/server/db';

export const dynamic = 'force-dynamic';

const NOTE_MAX_LENGTH = 200_000;

const body = z
  .object({
    title: z.string().trim().min(1).max(200).optional(),
    content: z.string().max(NOTE_MAX_LENGTH).optional(),
    folderId: z.uuid().optional(),
    folderPath: z.string().trim().min(1).max(500).optional(),
  })
  .refine((value) => Object.keys(value).length > 0);

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
      { error: 'bad_request', message: 'Titre vide ou note trop longue.' },
      { status: 400 },
    );
  }
  const db = getDb();
  const { folderPath, ...rest } = parsed.data;
  const changes: NoteChanges = rest;
  if (folderPath) {
    let path: readonly string[];
    try {
      path = parseFolderPath(folderPath);
    } catch {
      return Response.json(
        { error: 'bad_request', message: 'Chemin de dossier invalide : six niveaux au plus.' },
        { status: 400 },
      );
    }
    changes.folderId = (await ensureFolderPath(db, user.id, path)).folderId;
  }
  const note = await updateNote(db, user.id, id.data, changes);
  if (!note) {
    return Response.json({ error: 'not_found' }, { status: 404 });
  }
  return Response.json({ note: { id: note.id, folderId: note.folderId } });
}

// Sends the note to the trash, where it stays 30 days.
export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ error: 'unauthorized' }, { status: 401 });
  }
  const id = z.uuid().safeParse((await context.params).id);
  if (!id.success) {
    return Response.json({ error: 'not_found' }, { status: 404 });
  }
  const item = await trashNote(getDb(), user.id, id.data);
  if (!item) {
    return Response.json(
      { error: 'not_found', message: 'Cette note n’existe plus. Recharge la page.' },
      { status: 404 },
    );
  }
  return Response.json({ trash: { id: item.id, name: item.name } });
}
