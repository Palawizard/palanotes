import { and, desc, eq, inArray } from 'drizzle-orm';
import type { DbOrTx } from '../client';
import { notes } from '../schema';

export type Note = typeof notes.$inferSelect;

export interface NoteIndexEntry {
  id: string;
  folderId: string;
  title: string;
  summary: string;
  tags: string[];
}

// What the model sees of existing notes: never their full content.
export async function listNoteIndex(
  db: DbOrTx,
  userId: string,
  limit = 300,
): Promise<NoteIndexEntry[]> {
  return db
    .select({
      id: notes.id,
      folderId: notes.folderId,
      title: notes.title,
      summary: notes.summary,
      tags: notes.tags,
    })
    .from(notes)
    .where(eq(notes.userId, userId))
    .orderBy(desc(notes.updatedAt))
    .limit(limit);
}

export async function findNote(db: DbOrTx, userId: string, noteId: string): Promise<Note | null> {
  const [note] = await db
    .select()
    .from(notes)
    .where(and(eq(notes.id, noteId), eq(notes.userId, userId)))
    .limit(1);
  return note ?? null;
}

export async function findNotesByIds(
  db: DbOrTx,
  userId: string,
  noteIds: readonly string[],
): Promise<Pick<Note, 'id' | 'title' | 'folderId'>[]> {
  if (noteIds.length === 0) {
    return [];
  }
  return db
    .select({ id: notes.id, title: notes.title, folderId: notes.folderId })
    .from(notes)
    .where(and(eq(notes.userId, userId), inArray(notes.id, [...noteIds])));
}
