import { and, desc, eq, inArray, sql } from 'drizzle-orm';
import type { DbOrTx } from '../client';
import { folders, notes, noteVersions } from '../schema';

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

export interface NoteRowRecord {
  id: string;
  folderId: string;
  title: string;
  summary: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

const rowColumns = {
  id: notes.id,
  folderId: notes.folderId,
  title: notes.title,
  summary: notes.summary,
  tags: notes.tags,
  createdAt: notes.createdAt,
  updatedAt: notes.updatedAt,
};

// What a list shows of a note: never its content, which can be long.
export async function listNoteRowsInFolder(
  db: DbOrTx,
  userId: string,
  folderId: string,
): Promise<NoteRowRecord[]> {
  return db
    .select(rowColumns)
    .from(notes)
    .where(and(eq(notes.userId, userId), eq(notes.folderId, folderId)))
    .orderBy(desc(notes.updatedAt));
}

export async function listRecentNoteRows(
  db: DbOrTx,
  userId: string,
  limit = 30,
): Promise<NoteRowRecord[]> {
  return db
    .select(rowColumns)
    .from(notes)
    .where(eq(notes.userId, userId))
    .orderBy(desc(notes.updatedAt))
    .limit(limit);
}

export async function listNotesInFolder(
  db: DbOrTx,
  userId: string,
  folderId: string,
): Promise<Note[]> {
  return db
    .select()
    .from(notes)
    .where(and(eq(notes.userId, userId), eq(notes.folderId, folderId)))
    .orderBy(desc(notes.updatedAt));
}

export async function listRecentNotes(db: DbOrTx, userId: string, limit = 12): Promise<Note[]> {
  return db
    .select()
    .from(notes)
    .where(eq(notes.userId, userId))
    .orderBy(desc(notes.updatedAt))
    .limit(limit);
}

export interface NoteChanges {
  title?: string;
  content?: string;
  folderId?: string;
}

// Manual edit or move. The previous state is kept in note_versions first.
export async function updateNote(
  db: DbOrTx,
  userId: string,
  noteId: string,
  changes: NoteChanges,
): Promise<Note | null> {
  return db.transaction(async (tx) => {
    const [note] = await tx
      .select()
      .from(notes)
      .where(and(eq(notes.id, noteId), eq(notes.userId, userId)))
      .for('update')
      .limit(1);
    if (!note) {
      return null;
    }
    if (changes.folderId) {
      const [target] = await tx
        .select({ id: folders.id })
        .from(folders)
        .where(and(eq(folders.id, changes.folderId), eq(folders.userId, userId)))
        .limit(1);
      if (!target) {
        return null;
      }
    }
    await tx.insert(noteVersions).values({
      noteId: note.id,
      kind: 'before_edit',
      folderId: note.folderId,
      title: note.title,
      summary: note.summary,
      tags: note.tags,
      content: note.content,
    });
    const [updated] = await tx
      .update(notes)
      .set({ ...changes, updatedAt: sql`now()` })
      .where(eq(notes.id, note.id))
      .returning();
    return updated ?? null;
  });
}

export async function countNoteVersions(db: DbOrTx, noteId: string): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(noteVersions)
    .where(eq(noteVersions.noteId, noteId));
  return row?.count ?? 0;
}
