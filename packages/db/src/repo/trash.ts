import { and, asc, desc, eq, inArray, isNull, lt, sql } from 'drizzle-orm';
import { z } from 'zod';
import { buildFolderPaths, restoredFolderName, subtreeIds } from '@palanotes/core';
import type { Db, DbOrTx } from '../client';
import { folders, notes, noteVersions, sortRuns, trashItems } from '../schema';

const date = z.iso.datetime({ offset: true }).transform((value) => new Date(value));

const payloadSchema = z.object({
  version: z.literal(1),
  folders: z.array(
    z.object({
      id: z.uuid(),
      parentId: z.uuid().nullable(),
      name: z.string(),
      createdAt: date,
      updatedAt: date,
    }),
  ),
  notes: z.array(
    z.object({
      id: z.uuid(),
      folderId: z.uuid(),
      title: z.string(),
      content: z.string(),
      summary: z.string(),
      tags: z.array(z.string()),
      createdAt: date,
      updatedAt: date,
    }),
  ),
  versions: z.array(
    z.object({
      id: z.uuid(),
      noteId: z.uuid(),
      sortRunId: z.uuid().nullable(),
      kind: z.enum(['created', 'before_append', 'before_edit']),
      folderId: z.uuid().nullable(),
      title: z.string().nullable(),
      summary: z.string().nullable(),
      tags: z.array(z.string()).nullable(),
      content: z.string(),
      createdAt: date,
    }),
  ),
});

export interface TrashItem {
  id: string;
  folderId: string;
  name: string;
  path: string[];
  noteCount: number;
  folderCount: number;
  deletedAt: Date;
}

const itemColumns = {
  id: trashItems.id,
  folderId: trashItems.folderId,
  name: trashItems.name,
  path: trashItems.path,
  noteCount: trashItems.noteCount,
  folderCount: trashItems.folderCount,
  deletedAt: trashItems.deletedAt,
};

// Deletes a folder with all its notes and subfolders, whether empty or not. Everything is
// copied into the trash first, in the same transaction, so the deletion can be undone.
export async function trashFolder(
  db: Db,
  userId: string,
  folderId: string,
): Promise<TrashItem | null> {
  return db.transaction(async (tx) => {
    const all = await tx
      .select()
      .from(folders)
      .where(eq(folders.userId, userId))
      .orderBy(asc(folders.createdAt))
      .for('update');
    const root = all.find((folder) => folder.id === folderId);
    if (!root) {
      return null;
    }
    const ids = subtreeIds(all, folderId);
    // Breadth first from the deleted folder: parents before children, so the rows can be
    // inserted back in this order and deleted in the reverse one.
    const subtree = [root];
    for (let index = 0; index < subtree.length; index += 1) {
      const parentId = subtree[index]?.id;
      subtree.push(
        ...all.filter(
          (folder) =>
            folder.parentId === parentId && ids.has(folder.id) && !subtree.includes(folder),
        ),
      );
    }

    const held = await tx
      .select({
        id: notes.id,
        folderId: notes.folderId,
        title: notes.title,
        content: notes.content,
        summary: notes.summary,
        tags: notes.tags,
        createdAt: notes.createdAt,
        updatedAt: notes.updatedAt,
      })
      .from(notes)
      .where(and(eq(notes.userId, userId), inArray(notes.folderId, [...ids])))
      .for('update');
    const noteIds = held.map((note) => note.id);
    const versions =
      noteIds.length > 0
        ? await tx.select().from(noteVersions).where(inArray(noteVersions.noteId, noteIds))
        : [];

    const path = buildFolderPaths(all).get(folderId) ?? [root.name];
    const [item] = await tx
      .insert(trashItems)
      .values({
        userId,
        folderId: root.id,
        parentId: root.parentId,
        name: root.name,
        path,
        noteCount: held.length,
        folderCount: subtree.length - 1,
        payload: {
          version: 1,
          folders: subtree.map((folder) => ({
            id: folder.id,
            parentId: folder.parentId,
            name: folder.name,
            createdAt: folder.createdAt.toISOString(),
            updatedAt: folder.updatedAt.toISOString(),
          })),
          notes: held.map((note) => ({
            ...note,
            createdAt: note.createdAt.toISOString(),
            updatedAt: note.updatedAt.toISOString(),
          })),
          versions: versions.map((version) => ({
            id: version.id,
            noteId: version.noteId,
            sortRunId: version.sortRunId,
            kind: version.kind,
            folderId: version.folderId,
            title: version.title,
            summary: version.summary,
            tags: version.tags,
            content: version.content,
            createdAt: version.createdAt.toISOString(),
          })),
        },
      })
      .returning(itemColumns);
    if (!item) {
      throw new Error('trash insert returned no row');
    }

    if (noteIds.length > 0) {
      await tx.delete(notes).where(and(eq(notes.userId, userId), inArray(notes.id, noteIds)));
    }
    for (const folder of [...subtree].reverse()) {
      await tx.delete(folders).where(and(eq(folders.id, folder.id), eq(folders.userId, userId)));
    }
    return item;
  });
}

export async function listTrash(db: DbOrTx, userId: string): Promise<TrashItem[]> {
  return db
    .select(itemColumns)
    .from(trashItems)
    .where(eq(trashItems.userId, userId))
    .orderBy(desc(trashItems.deletedAt));
}

export async function countTrash(db: DbOrTx, userId: string): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(trashItems)
    .where(eq(trashItems.userId, userId));
  return row?.count ?? 0;
}

export interface RestoredFolder {
  folderId: string;
  name: string;
  parentId: string | null;
  renamed: boolean;
}

// Puts a deleted folder back with its notes, subfolders and note history. It returns to its
// old parent when that folder still exists, otherwise to the top level, and takes a
// "(restauré)" suffix when a folder with the same name is there now.
export async function restoreTrashItem(
  db: Db,
  userId: string,
  trashId: string,
): Promise<RestoredFolder | null> {
  return db.transaction(async (tx) => {
    const [item] = await tx
      .select()
      .from(trashItems)
      .where(and(eq(trashItems.id, trashId), eq(trashItems.userId, userId)))
      .for('update')
      .limit(1);
    if (!item) {
      return null;
    }
    const payload = payloadSchema.parse(item.payload);

    const [parent] = item.parentId
      ? await tx
          .select({ id: folders.id })
          .from(folders)
          .where(and(eq(folders.id, item.parentId), eq(folders.userId, userId)))
          .limit(1)
      : [];
    const parentId = parent?.id ?? null;
    const siblings = await tx
      .select({ name: folders.name })
      .from(folders)
      .where(
        and(
          eq(folders.userId, userId),
          parentId ? eq(folders.parentId, parentId) : isNull(folders.parentId),
        ),
      );
    const name = restoredFolderName(
      item.name,
      siblings.map((sibling) => sibling.name),
    );

    for (const folder of payload.folders) {
      const isRoot = folder.id === item.folderId;
      await tx.insert(folders).values({
        ...folder,
        userId,
        parentId: isRoot ? parentId : folder.parentId,
        name: isRoot ? name : folder.name,
      });
    }
    if (payload.notes.length > 0) {
      await tx.insert(notes).values(payload.notes.map((note) => ({ ...note, userId })));
    }
    if (payload.versions.length > 0) {
      const runIds = [...new Set(payload.versions.flatMap((version) => version.sortRunId ?? []))];
      const liveRuns =
        runIds.length > 0
          ? await tx
              .select({ id: sortRuns.id })
              .from(sortRuns)
              .where(and(eq(sortRuns.userId, userId), inArray(sortRuns.id, runIds)))
          : [];
      const live = new Set(liveRuns.map((run) => run.id));
      await tx.insert(noteVersions).values(
        payload.versions.map((version) => ({
          ...version,
          sortRunId: version.sortRunId && live.has(version.sortRunId) ? version.sortRunId : null,
        })),
      );
    }
    await tx.delete(trashItems).where(eq(trashItems.id, item.id));
    return { folderId: item.folderId, name, parentId, renamed: name !== item.name };
  });
}

export async function deleteTrashItem(
  db: DbOrTx,
  userId: string,
  trashId: string,
): Promise<boolean> {
  const removed = await db
    .delete(trashItems)
    .where(and(eq(trashItems.id, trashId), eq(trashItems.userId, userId)))
    .returning({ id: trashItems.id });
  return removed.length > 0;
}

export async function emptyTrash(db: DbOrTx, userId: string): Promise<number> {
  const removed = await db
    .delete(trashItems)
    .where(eq(trashItems.userId, userId))
    .returning({ id: trashItems.id });
  return removed.length;
}

// For every account: drops what was deleted more than `days` days ago.
export async function purgeExpiredTrash(db: DbOrTx, days: number): Promise<number> {
  const removed = await db
    .delete(trashItems)
    .where(lt(trashItems.deletedAt, sql`now() - make_interval(days => ${days})`))
    .returning({ id: trashItems.id });
  return removed.length;
}
