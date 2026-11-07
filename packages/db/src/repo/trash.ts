import { and, asc, desc, eq, inArray, isNull, lt, sql } from 'drizzle-orm';
import { z } from 'zod';
import { buildFolderPaths, restoredFolderName, subtreeIds } from '@palanotes/core';
import type { Db, DbOrTx } from '../client';
import { ensureFolderPath } from './folders';
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
  kind: 'folder' | 'note';
  folderId: string;
  noteId: string | null;
  name: string;
  path: string[];
  noteCount: number;
  folderCount: number;
  deletedAt: Date;
}

const itemColumns = {
  id: trashItems.id,
  kind: trashItems.kind,
  folderId: trashItems.folderId,
  noteId: trashItems.noteId,
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
          versions: versions.map(versionPayload),
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

type VersionRow = typeof noteVersions.$inferSelect;

function versionPayload(version: VersionRow) {
  return {
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
  };
}

// Deletes one note. It is copied into the trash with its history first, in the same
// transaction, together with the path of its folder so it can find its way back.
export async function trashNote(db: Db, userId: string, noteId: string): Promise<TrashItem | null> {
  return db.transaction(async (tx) => {
    const [note] = await tx
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
      .where(and(eq(notes.id, noteId), eq(notes.userId, userId)))
      .for('update')
      .limit(1);
    if (!note) {
      return null;
    }
    const all = await tx.select().from(folders).where(eq(folders.userId, userId));
    const path = buildFolderPaths(all).get(note.folderId) ?? [];
    const versions = await tx.select().from(noteVersions).where(eq(noteVersions.noteId, note.id));

    const [item] = await tx
      .insert(trashItems)
      .values({
        userId,
        kind: 'note',
        folderId: note.folderId,
        noteId: note.id,
        parentId: note.folderId,
        name: note.title,
        path,
        noteCount: 1,
        folderCount: 0,
        payload: {
          version: 1,
          folders: [],
          notes: [
            {
              ...note,
              createdAt: note.createdAt.toISOString(),
              updatedAt: note.updatedAt.toISOString(),
            },
          ],
          versions: versions.map(versionPayload),
        },
      })
      .returning(itemColumns);
    if (!item) {
      throw new Error('trash insert returned no row');
    }
    await tx.delete(notes).where(and(eq(notes.id, note.id), eq(notes.userId, userId)));
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
  kind: 'folder';
  folderId: string;
  name: string;
  parentId: string | null;
  renamed: boolean;
}

export interface RestoredNote {
  kind: 'note';
  noteId: string;
  folderId: string;
  name: string;
  // The note's folder no longer existed and was made again from its old path.
  recreated: boolean;
}

export type Restored = RestoredFolder | RestoredNote;

// Puts a deleted folder back with its notes, subfolders and note history. It returns to its
// old parent when that folder still exists, otherwise to the top level, and takes a
// "(restauré)" suffix when a folder with the same name is there now.
// A deleted note goes back to its folder; when that folder is gone too, its old path is
// made again (or found, if a folder with the same path exists now).
export async function restoreTrashItem(
  db: Db,
  userId: string,
  trashId: string,
): Promise<Restored | null> {
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

    if (item.kind === 'note') {
      const [home] = await tx
        .select({ id: folders.id })
        .from(folders)
        .where(and(eq(folders.id, item.folderId), eq(folders.userId, userId)))
        .limit(1);
      let folderId = home?.id;
      let recreated = false;
      if (!folderId) {
        const ensured = await ensureFolderPath(
          tx,
          userId,
          item.path.length > 0 ? item.path : ['Restauré'],
        );
        folderId = ensured.folderId;
        recreated = ensured.created.length > 0;
      }
      await insertNotesAndVersions(
        tx,
        userId,
        payload.notes.map((note) => ({ ...note, folderId })),
        payload.versions,
      );
      await tx.delete(trashItems).where(eq(trashItems.id, item.id));
      return {
        kind: 'note',
        noteId: item.noteId ?? payload.notes[0]?.id ?? '',
        folderId,
        name: item.name,
        recreated,
      };
    }

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
    await insertNotesAndVersions(tx, userId, payload.notes, payload.versions);
    await tx.delete(trashItems).where(eq(trashItems.id, item.id));
    return { kind: 'folder', folderId: item.folderId, name, parentId, renamed: name !== item.name };
  });
}

type Payload = z.infer<typeof payloadSchema>;

// Puts trashed notes and their history back. A history line keeps its sort run only if
// that run still exists.
async function insertNotesAndVersions(
  tx: DbOrTx,
  userId: string,
  held: Payload['notes'],
  versions: Payload['versions'],
): Promise<void> {
  if (held.length > 0) {
    await tx.insert(notes).values(held.map((note) => ({ ...note, userId })));
  }
  if (versions.length === 0) {
    return;
  }
  const runIds = [...new Set(versions.flatMap((version) => version.sortRunId ?? []))];
  const liveRuns =
    runIds.length > 0
      ? await tx
          .select({ id: sortRuns.id })
          .from(sortRuns)
          .where(and(eq(sortRuns.userId, userId), inArray(sortRuns.id, runIds)))
      : [];
  const live = new Set(liveRuns.map((run) => run.id));
  await tx.insert(noteVersions).values(
    versions.map((version) => ({
      ...version,
      sortRunId: version.sortRunId && live.has(version.sortRunId) ? version.sortRunId : null,
    })),
  );
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
