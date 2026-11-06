import { afterAll, describe, expect, it } from 'vitest';
import { eq, sql } from 'drizzle-orm';
import { closeDb } from '../src/client';
import { createEntry } from '../src/repo/entries';
import { ensureFolderPath, findFolder, listFolders } from '../src/repo/folders';
import { findNote, updateNote } from '../src/repo/notes';
import { searchNotes } from '../src/repo/search';
import { createSortRun } from '../src/repo/sort-runs';
import {
  countTrash,
  deleteTrashItem,
  emptyTrash,
  listTrash,
  purgeExpiredTrash,
  restoreTrashItem,
  trashFolder,
} from '../src/repo/trash';
import { notes, noteVersions, sortRuns, trashItems } from '../src/schema';
import type { User } from '../src/repo/users';
import { createTestDb, createTestUser } from './db';

const db = createTestDb();
afterAll(() => closeDb(db));

async function folder(user: User, path: string[]): Promise<string> {
  return (await ensureFolderPath(db, user.id, path)).folderId;
}

async function note(user: User, folderId: string, title: string, content: string) {
  const [row] = await db
    .insert(notes)
    .values({ userId: user.id, folderId, title, content, summary: title, tags: ['cours'] })
    .returning();
  if (!row) throw new Error('no note');
  return row;
}

// Cours / Réseau (2 notes, one edited by hand) and Cours / Réseau / TCP (1 note).
async function coursReseau(user: User) {
  const cours = await folder(user, ['Cours']);
  const reseau = await folder(user, ['Cours', 'Réseau']);
  const tcp = await folder(user, ['Cours', 'Réseau', 'TCP']);
  const masque = await note(
    user,
    reseau,
    'Masques de sous-réseau',
    'Le masque /26 donne 62 hôtes.',
  );
  await note(user, reseau, 'Modèle OSI', 'Sept couches, de physique à application.');
  const handshake = await note(user, tcp, 'Poignée de main TCP', 'SYN, SYN-ACK, ACK.');
  await updateNote(db, user.id, masque.id, {
    content: 'Le masque /26 donne 62 hôtes utilisables.',
  });
  return { cours, reseau, tcp, masque, handshake };
}

describe('trashFolder', () => {
  it('deletes a folder that holds notes and subfolders, and keeps a copy in the trash', async () => {
    const user = await createTestUser(db);
    const { cours, reseau, tcp, masque, handshake } = await coursReseau(user);

    const item = await trashFolder(db, user.id, reseau);

    expect(item).toMatchObject({
      folderId: reseau,
      name: 'Réseau',
      path: ['Cours', 'Réseau'],
      noteCount: 3,
      folderCount: 1,
    });
    expect(await findFolder(db, user.id, reseau)).toBeNull();
    expect(await findFolder(db, user.id, tcp)).toBeNull();
    expect(await findFolder(db, user.id, cours)).not.toBeNull();
    expect(await findNote(db, user.id, masque.id)).toBeNull();
    expect(await findNote(db, user.id, handshake.id)).toBeNull();
    expect(await searchNotes(db, user.id, 'masque')).toHaveLength(0);
    expect(await countTrash(db, user.id)).toBe(1);
  });

  it('refuses a folder of another account', async () => {
    const alice = await createTestUser(db);
    const bob = await createTestUser(db);
    const privé = await folder(alice, ['Privé']);
    await note(alice, privé, 'Journal', 'Rien pour Bob.');

    expect(await trashFolder(db, bob.id, privé)).toBeNull();
    expect(await findFolder(db, alice.id, privé)).not.toBeNull();
    expect(await countTrash(db, bob.id)).toBe(0);
  });
});

describe('restoreTrashItem', () => {
  it('puts back the folders, notes and history exactly as they were', async () => {
    const user = await createTestUser(db);
    const { cours, reseau, tcp, masque, handshake } = await coursReseau(user);
    const before = await findNote(db, user.id, masque.id);
    const item = await trashFolder(db, user.id, reseau);
    if (!item) throw new Error('not trashed');

    const restored = await restoreTrashItem(db, user.id, item.id);

    expect(restored).toEqual({ folderId: reseau, name: 'Réseau', parentId: cours, renamed: false });
    expect((await findFolder(db, user.id, tcp))?.parentId).toBe(reseau);
    expect(await findNote(db, user.id, masque.id)).toEqual(before);
    expect((await findNote(db, user.id, handshake.id))?.folderId).toBe(tcp);
    const history = await db.select().from(noteVersions).where(eq(noteVersions.noteId, masque.id));
    expect(history.map((version) => version.content)).toEqual(['Le masque /26 donne 62 hôtes.']);
    expect((await searchNotes(db, user.id, 'masque')).map((hit) => hit.id)).toEqual([masque.id]);
    expect(await countTrash(db, user.id)).toBe(0);
  });

  it('goes to the top level when the old parent is gone, with a suffix when the name is taken', async () => {
    const user = await createTestUser(db);
    const { cours, reseau } = await coursReseau(user);
    const item = await trashFolder(db, user.id, reseau);
    if (!item) throw new Error('not trashed');
    await trashFolder(db, user.id, cours);
    await folder(user, ['réseau']);

    const restored = await restoreTrashItem(db, user.id, item.id);

    expect(restored).toMatchObject({ name: 'Réseau (restauré)', parentId: null, renamed: true });
    const names = (await listFolders(db, user.id)).map((row) => row.name).sort();
    expect(names).toEqual(['Réseau (restauré)', 'TCP', 'réseau']);
  });

  it('drops the link to a filing that no longer exists', async () => {
    const user = await createTestUser(db);
    const reseau = await folder(user, ['Réseau']);
    const masque = await note(user, reseau, 'Masques', 'Le masque /26 donne 62 hôtes.');
    const entry = await createEntry(db, user.id, 'Le masque /26 donne 62 hôtes.');
    const run = await createSortRun(db, {
      userId: user.id,
      entryId: entry.id,
      plan: {
        explanation: 'Cours de réseau.',
        actions: [
          {
            type: 'create',
            folderPath: 'Réseau',
            title: 'Masques',
            content: masque.content,
            summary: 'Masques.',
            tags: [],
          },
        ],
      },
      llmMode: 'subscription',
      model: 'test',
      inputTokens: null,
      outputTokens: null,
    });
    await db.insert(noteVersions).values({
      noteId: masque.id,
      sortRunId: run.id,
      kind: 'created',
      content: masque.content,
    });
    const item = await trashFolder(db, user.id, reseau);
    if (!item) throw new Error('not trashed');
    await db.delete(sortRuns).where(eq(sortRuns.id, run.id));

    await restoreTrashItem(db, user.id, item.id);

    const [version] = await db
      .select()
      .from(noteVersions)
      .where(eq(noteVersions.noteId, masque.id));
    expect(version?.sortRunId).toBeNull();
  });

  it('refuses an item of another account', async () => {
    const alice = await createTestUser(db);
    const bob = await createTestUser(db);
    const item = await trashFolder(db, alice.id, await folder(alice, ['Privé']));
    if (!item) throw new Error('not trashed');

    expect(await restoreTrashItem(db, bob.id, item.id)).toBeNull();
    expect(await deleteTrashItem(db, bob.id, item.id)).toBe(false);
    expect(await countTrash(db, alice.id)).toBe(1);
  });
});

describe('emptying the trash', () => {
  it('deletes one item, then everything of the account', async () => {
    const user = await createTestUser(db);
    const other = await createTestUser(db);
    const first = await trashFolder(db, user.id, await folder(user, ['Un']));
    await trashFolder(db, user.id, await folder(user, ['Deux']));
    await trashFolder(db, other.id, await folder(other, ['Ailleurs']));
    if (!first) throw new Error('not trashed');

    expect(await deleteTrashItem(db, user.id, first.id)).toBe(true);
    expect((await listTrash(db, user.id)).map((item) => item.name)).toEqual(['Deux']);
    expect(await emptyTrash(db, user.id)).toBe(1);
    expect(await countTrash(db, user.id)).toBe(0);
    expect(await countTrash(db, other.id)).toBe(1);
  });

  it('purges what was deleted more than thirty days ago', async () => {
    const user = await createTestUser(db);
    const old = await trashFolder(db, user.id, await folder(user, ['Ancien']));
    await trashFolder(db, user.id, await folder(user, ['Récent']));
    if (!old) throw new Error('not trashed');
    await db
      .update(trashItems)
      .set({ deletedAt: sql`now() - interval '31 days'` })
      .where(eq(trashItems.id, old.id));

    expect(await purgeExpiredTrash(db, 30)).toBeGreaterThanOrEqual(1);
    expect((await listTrash(db, user.id)).map((item) => item.name)).toEqual(['Récent']);
  });
});
