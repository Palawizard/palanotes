import { and, asc, eq, isNull, sql } from 'drizzle-orm';
import { buildFolderPaths, samePath, subtreeIds } from '@palanotes/core';
import type { Db, DbOrTx } from '../client';
import { folders, notes, noteVersions } from '../schema';

export type Folder = typeof folders.$inferSelect;

export async function listFolders(db: DbOrTx, userId: string): Promise<Folder[]> {
  return db.select().from(folders).where(eq(folders.userId, userId)).orderBy(asc(folders.name));
}

export async function findFolder(
  db: DbOrTx,
  userId: string,
  folderId: string,
): Promise<Folder | null> {
  const [folder] = await db
    .select()
    .from(folders)
    .where(and(eq(folders.id, folderId), eq(folders.userId, userId)))
    .limit(1);
  return folder ?? null;
}

// Returns the folder at `path`, creating the missing levels. Existing folders match
// regardless of case and accents, so "cours / reseau" lands in "Cours / Réseau".
export async function ensureFolderPath(
  db: DbOrTx,
  userId: string,
  path: readonly string[],
): Promise<{ folderId: string; created: string[] }> {
  const existing = await listFolders(db, userId);
  const paths = buildFolderPaths(existing);
  const created: string[] = [];
  let parentId: string | null = null;

  for (let depth = 1; depth <= path.length; depth += 1) {
    const prefix = path.slice(0, depth);
    const match = existing.find((folder) => samePath(paths.get(folder.id) ?? [], prefix));
    if (match) {
      parentId = match.id;
      continue;
    }
    const name = prefix[prefix.length - 1] ?? '';
    const [folder]: Folder[] = await db
      .insert(folders)
      .values({ userId, parentId, name })
      .returning();
    if (!folder) {
      throw new Error('folder insert returned no row');
    }
    existing.push(folder);
    paths.set(folder.id, [...prefix]);
    created.push(folder.id);
    parentId = folder.id;
  }
  if (!parentId) {
    throw new Error('folder path is empty');
  }
  return { folderId: parentId, created };
}

export async function listRootFolders(db: DbOrTx, userId: string): Promise<Folder[]> {
  return db
    .select()
    .from(folders)
    .where(and(eq(folders.userId, userId), isNull(folders.parentId)))
    .orderBy(asc(folders.name));
}

export interface FolderWithCount extends Folder {
  noteCount: number;
}

export async function listFoldersWithCounts(
  db: DbOrTx,
  userId: string,
): Promise<FolderWithCount[]> {
  const rows = await db
    .select({ folder: folders, noteCount: sql<number>`count(${notes.id})::int` })
    .from(folders)
    .leftJoin(notes, eq(notes.folderId, folders.id))
    .where(eq(folders.userId, userId))
    .groupBy(folders.id)
    .orderBy(asc(folders.name));
  return rows.map((row) => ({ ...row.folder, noteCount: row.noteCount }));
}

export class FolderNameTakenError extends Error {
  constructor() {
    super('folder name taken');
    this.name = 'FolderNameTakenError';
  }
}

export async function renameFolder(
  db: DbOrTx,
  userId: string,
  folderId: string,
  name: string,
): Promise<Folder | null> {
  const folder = await findFolder(db, userId, folderId);
  if (!folder) {
    return null;
  }
  const siblings = await db
    .select({ id: folders.id, name: folders.name })
    .from(folders)
    .where(
      and(
        eq(folders.userId, userId),
        folder.parentId ? eq(folders.parentId, folder.parentId) : isNull(folders.parentId),
      ),
    );
  if (siblings.some((sibling) => sibling.id !== folderId && samePath([sibling.name], [name]))) {
    throw new FolderNameTakenError();
  }
  const [renamed] = await db
    .update(folders)
    .set({ name, updatedAt: sql`now()` })
    .where(and(eq(folders.id, folderId), eq(folders.userId, userId)))
    .returning();
  return renamed ?? null;
}

export class FolderMoveError extends Error {
  constructor() {
    super('a folder cannot go inside itself or one of its subfolders');
    this.name = 'FolderMoveError';
  }
}

async function siblingsOf(db: DbOrTx, userId: string, parentId: string | null) {
  return db
    .select({ id: folders.id, name: folders.name })
    .from(folders)
    .where(
      and(
        eq(folders.userId, userId),
        parentId ? eq(folders.parentId, parentId) : isNull(folders.parentId),
      ),
    );
}

async function subtreeOf(db: DbOrTx, userId: string, folderId: string): Promise<Set<string>> {
  const all = await db
    .select({ id: folders.id, parentId: folders.parentId, name: folders.name })
    .from(folders)
    .where(eq(folders.userId, userId));
  return subtreeIds(all, folderId);
}

// New folder at the top level or inside one of the account's folders.
export async function createFolder(
  db: DbOrTx,
  userId: string,
  parentId: string | null,
  name: string,
): Promise<Folder | null> {
  if (parentId && !(await findFolder(db, userId, parentId))) {
    return null;
  }
  const siblings = await siblingsOf(db, userId, parentId);
  if (siblings.some((sibling) => samePath([sibling.name], [name]))) {
    throw new FolderNameTakenError();
  }
  const [folder] = await db.insert(folders).values({ userId, parentId, name }).returning();
  return folder ?? null;
}

// Moves a folder, with its notes and subfolders, under another folder or to the top level.
export async function moveFolder(
  db: DbOrTx,
  userId: string,
  folderId: string,
  parentId: string | null,
): Promise<Folder | null> {
  const folder = await findFolder(db, userId, folderId);
  if (!folder || (parentId && !(await findFolder(db, userId, parentId)))) {
    return null;
  }
  if (folder.parentId === parentId) {
    return folder;
  }
  if (parentId && (await subtreeOf(db, userId, folderId)).has(parentId)) {
    throw new FolderMoveError();
  }
  const siblings = await siblingsOf(db, userId, parentId);
  if (siblings.some((sibling) => samePath([sibling.name], [folder.name]))) {
    throw new FolderNameTakenError();
  }
  const [moved] = await db
    .update(folders)
    .set({ parentId, updatedAt: sql`now()` })
    .where(and(eq(folders.id, folderId), eq(folders.userId, userId)))
    .returning();
  return moved ?? null;
}

export interface MergeResult {
  movedNotes: number;
  movedFolders: number;
}

// Puts the notes and subfolders of `sourceId` into `targetId`, then removes the emptied
// source. A subfolder whose name already exists in the target is merged into it the same
// way. Every moved note keeps its previous state in note_versions. No note is deleted.
export async function mergeFolder(
  db: Db,
  userId: string,
  sourceId: string,
  targetId: string,
): Promise<MergeResult | null> {
  return db.transaction(async (tx) => {
    const [source, target] = await Promise.all([
      findFolder(tx, userId, sourceId),
      findFolder(tx, userId, targetId),
    ]);
    if (!source || !target) {
      return null;
    }
    if ((await subtreeOf(tx, userId, sourceId)).has(targetId)) {
      throw new FolderMoveError();
    }
    const result: MergeResult = { movedNotes: 0, movedFolders: 0 };
    await mergeInto(tx, userId, source.id, target.id, result);
    return result;
  });
}

async function mergeInto(
  tx: DbOrTx,
  userId: string,
  sourceId: string,
  targetId: string,
  result: MergeResult,
): Promise<void> {
  const moving = await tx
    .select()
    .from(notes)
    .where(and(eq(notes.userId, userId), eq(notes.folderId, sourceId)))
    .for('update');
  if (moving.length > 0) {
    await tx.insert(noteVersions).values(
      moving.map((note) => ({
        noteId: note.id,
        kind: 'before_edit' as const,
        folderId: note.folderId,
        title: note.title,
        summary: note.summary,
        tags: note.tags,
        content: note.content,
      })),
    );
    await tx
      .update(notes)
      .set({ folderId: targetId, updatedAt: sql`now()` })
      .where(and(eq(notes.userId, userId), eq(notes.folderId, sourceId)));
    result.movedNotes += moving.length;
  }

  const [children, targetChildren] = await Promise.all([
    siblingsOf(tx, userId, sourceId),
    siblingsOf(tx, userId, targetId),
  ]);
  for (const child of children) {
    const twin = targetChildren.find((other) => samePath([other.name], [child.name]));
    if (twin) {
      await mergeInto(tx, userId, child.id, twin.id, result);
    } else {
      await tx
        .update(folders)
        .set({ parentId: targetId, updatedAt: sql`now()` })
        .where(and(eq(folders.id, child.id), eq(folders.userId, userId)));
      result.movedFolders += 1;
    }
  }
  await tx.delete(folders).where(and(eq(folders.id, sourceId), eq(folders.userId, userId)));
}
