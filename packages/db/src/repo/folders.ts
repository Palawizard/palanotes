import { and, asc, eq, isNull, sql } from 'drizzle-orm';
import { buildFolderPaths, samePath } from '@palanotes/core';
import type { DbOrTx } from '../client';
import { folders, notes } from '../schema';

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
