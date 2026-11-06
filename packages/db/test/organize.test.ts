import { afterAll, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { closeDb } from '../src/client';
import {
  createFolder,
  deleteEmptyFolder,
  ensureFolderPath,
  findFolder,
  FolderMoveError,
  FolderNameTakenError,
  FolderNotEmptyError,
  listFoldersWithCounts,
  mergeFolder,
  moveFolder,
} from '../src/repo/folders';
import { countNoteVersions, findNote } from '../src/repo/notes';
import { notes } from '../src/schema';
import type { User } from '../src/repo/users';
import { createTestDb, createTestUser } from './db';

const db = createTestDb();
afterAll(() => closeDb(db));

async function folder(user: User, path: string[]): Promise<string> {
  return (await ensureFolderPath(db, user.id, path)).folderId;
}

async function note(user: User, folderId: string, title: string) {
  const [row] = await db
    .insert(notes)
    .values({ userId: user.id, folderId, title, content: title, summary: title, tags: [] })
    .returning();
  if (!row) throw new Error('no note');
  return row;
}

describe('createFolder', () => {
  it('creates at the top level or inside a folder, with a unique name among siblings', async () => {
    const user = await createTestUser(db);
    const cours = await createFolder(db, user.id, null, 'Cours');
    expect(cours?.parentId).toBeNull();
    const reseau = await createFolder(db, user.id, cours?.id ?? null, 'Réseau');
    expect(reseau?.parentId).toBe(cours?.id);
    await expect(createFolder(db, user.id, cours?.id ?? null, 'reseau')).rejects.toBeInstanceOf(
      FolderNameTakenError,
    );
  });

  it('refuses a parent of another account', async () => {
    const alice = await createTestUser(db);
    const bob = await createTestUser(db);
    const aliceFolder = await folder(alice, ['Privé']);
    expect(await createFolder(db, bob.id, aliceFolder, 'Intrus')).toBeNull();
  });
});

describe('moveFolder', () => {
  it('moves a folder with its content and refuses its own subtree', async () => {
    const user = await createTestUser(db);
    const cours = await folder(user, ['Cours']);
    const reseau = await folder(user, ['Cours', 'Réseau']);
    const tcp = await folder(user, ['Cours', 'Réseau', 'TCP']);
    const archives = await folder(user, ['Archives']);
    await note(user, tcp, 'Poignée de main');

    await expect(moveFolder(db, user.id, reseau, tcp)).rejects.toBeInstanceOf(FolderMoveError);
    await expect(moveFolder(db, user.id, reseau, reseau)).rejects.toBeInstanceOf(FolderMoveError);

    const moved = await moveFolder(db, user.id, reseau, archives);
    expect(moved?.parentId).toBe(archives);
    expect((await findFolder(db, user.id, tcp))?.parentId).toBe(reseau);

    const top = await moveFolder(db, user.id, reseau, null);
    expect(top?.parentId).toBeNull();
    expect((await findFolder(db, user.id, cours))?.id).toBe(cours);
  });

  it('refuses a name already used at the destination', async () => {
    const user = await createTestUser(db);
    const a = await folder(user, ['A', 'Notes']);
    const b = await folder(user, ['B']);
    await folder(user, ['B', 'notes']);
    await expect(moveFolder(db, user.id, a, b)).rejects.toBeInstanceOf(FolderNameTakenError);
  });

  it('never touches the folders of another account', async () => {
    const alice = await createTestUser(db);
    const bob = await createTestUser(db);
    const aliceFolder = await folder(alice, ['Alice']);
    const bobFolder = await folder(bob, ['Bob']);
    expect(await moveFolder(db, bob.id, aliceFolder, bobFolder)).toBeNull();
    expect(await moveFolder(db, bob.id, bobFolder, aliceFolder)).toBeNull();
    expect((await findFolder(db, alice.id, aliceFolder))?.parentId).toBeNull();
  });
});

describe('mergeFolder', () => {
  it('moves notes and subfolders into the target, merges twins, and drops the source', async () => {
    const user = await createTestUser(db);
    const source = await folder(user, ['Réseaux']);
    const sourceTcp = await folder(user, ['Réseaux', 'TCP']);
    const sourceDns = await folder(user, ['Réseaux', 'DNS']);
    const target = await folder(user, ['Cours', 'Réseau']);
    const targetTcp = await folder(user, ['Cours', 'Réseau', 'tcp']);
    const top = await note(user, source, 'Modèle OSI');
    const nested = await note(user, sourceTcp, 'Fenêtre TCP');
    await note(user, targetTcp, 'Ports');
    await note(user, sourceDns, 'Résolution');

    const result = await mergeFolder(db, user.id, source, target);
    expect(result).toEqual({ movedNotes: 2, movedFolders: 1 });

    expect((await findNote(db, user.id, top.id))?.folderId).toBe(target);
    expect((await findNote(db, user.id, nested.id))?.folderId).toBe(targetTcp);
    expect(await countNoteVersions(db, top.id)).toBe(1);
    expect((await findFolder(db, user.id, sourceDns))?.parentId).toBe(target);
    expect(await findFolder(db, user.id, source)).toBeNull();
    expect(await findFolder(db, user.id, sourceTcp)).toBeNull();

    const counts = await listFoldersWithCounts(db, user.id);
    expect(counts.find((row) => row.id === targetTcp)?.noteCount).toBe(2);
    const all = await db.select().from(notes).where(eq(notes.userId, user.id));
    expect(all).toHaveLength(4);
  });

  it('refuses to merge a folder into its own subfolder or another account', async () => {
    const alice = await createTestUser(db);
    const bob = await createTestUser(db);
    const parent = await folder(alice, ['Parent']);
    const child = await folder(alice, ['Parent', 'Enfant']);
    await expect(mergeFolder(db, alice.id, parent, child)).rejects.toBeInstanceOf(FolderMoveError);
    await expect(mergeFolder(db, alice.id, parent, parent)).rejects.toBeInstanceOf(FolderMoveError);
    const bobFolder = await folder(bob, ['Bob']);
    expect(await mergeFolder(db, bob.id, parent, bobFolder)).toBeNull();
    expect(await mergeFolder(db, alice.id, parent, bobFolder)).toBeNull();
    expect(await findFolder(db, alice.id, parent)).not.toBeNull();
  });
});

describe('deleteEmptyFolder', () => {
  it('deletes only an empty folder of the account', async () => {
    const alice = await createTestUser(db);
    const bob = await createTestUser(db);
    const full = await folder(alice, ['Plein']);
    await note(alice, full, 'Garde-moi');
    const parent = await folder(alice, ['Parent']);
    await folder(alice, ['Parent', 'Enfant']);
    const empty = await folder(alice, ['Vide']);

    await expect(deleteEmptyFolder(db, alice.id, full)).rejects.toBeInstanceOf(FolderNotEmptyError);
    await expect(deleteEmptyFolder(db, alice.id, parent)).rejects.toBeInstanceOf(
      FolderNotEmptyError,
    );
    expect(await deleteEmptyFolder(db, bob.id, empty)).toBe(false);
    expect(await deleteEmptyFolder(db, alice.id, empty)).toBe(true);
    expect(await findFolder(db, alice.id, empty)).toBeNull();
  });
});
