import 'server-only';
import { z } from 'zod';
import { findNote, type Db, type NoteRowRecord } from '@palanotes/db';
import type { NoteRowData } from '@/components/note-row';
import type { FolderTree } from './folders';

export interface NotePaneData {
  id: string;
  title: string;
  content: string;
  tags: string[];
  folderId: string;
  updatedAt: string;
  trail: { id: string; name: string }[];
}

const noteId = z.uuid();

// The note opened in the right pane, if the id is valid and belongs to the account.
export async function loadNotePane(
  db: Db,
  userId: string,
  raw: unknown,
  tree: FolderTree,
): Promise<NotePaneData | null> {
  const id = noteId.safeParse(Array.isArray(raw) ? raw[0] : raw);
  if (!id.success) return null;
  const note = await findNote(db, userId, id.data);
  if (!note) return null;
  return {
    id: note.id,
    title: note.title,
    content: note.content,
    tags: note.tags,
    folderId: note.folderId,
    updatedAt: note.updatedAt.toISOString(),
    trail: tree.ancestors(note.folderId).map((node) => ({ id: node.id, name: node.name })),
  };
}

export function toRowData(
  note: NoteRowRecord,
  date: 'createdAt' | 'updatedAt',
  folderPath?: string,
): NoteRowData {
  return {
    id: note.id,
    title: note.title,
    excerpt: note.summary,
    tags: note.tags,
    date: note[date].toISOString(),
    folderId: note.folderId,
    folderPath,
  };
}
