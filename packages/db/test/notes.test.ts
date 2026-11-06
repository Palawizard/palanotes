import { afterAll, describe, expect, it } from 'vitest';
import { closeDb } from '../src/client';
import {
  ensureFolderPath,
  FolderNameTakenError,
  listFoldersWithCounts,
  renameFolder,
} from '../src/repo/folders';
import {
  countNoteVersions,
  findNote,
  listNoteRowsInFolder,
  listNotesInFolder,
  listRecentNoteRows,
  updateNote,
} from '../src/repo/notes';
import { notes } from '../src/schema';
import type { User } from '../src/repo/users';
import { createTestDb, createTestUser } from './db';

const db = createTestDb();
afterAll(() => closeDb(db));

async function note(user: User, path: string[], title: string) {
  const { folderId } = await ensureFolderPath(db, user.id, path);
  const [row] = await db
    .insert(notes)
    .values({ userId: user.id, folderId, title, content: 'avant', summary: 's', tags: [] })
    .returning();
  if (!row) throw new Error('no note');
  return row;
}

describe('notes and folders', () => {
  it('edits a note and keeps the previous version', async () => {
    const user = await createTestUser(db);
    const original = await note(user, ['Cours'], 'OSI');
    const updated = await updateNote(db, user.id, original.id, {
      title: 'Modèle OSI',
      content: 'après',
    });
    expect(updated).toMatchObject({ title: 'Modèle OSI', content: 'après' });
    expect(await countNoteVersions(db, original.id)).toBe(1);
  });

  it('moves a note to another folder of the same account only', async () => {
    const alice = await createTestUser(db);
    const bob = await createTestUser(db);
    const moved = await note(alice, ['Cours'], 'OSI');
    const target = await ensureFolderPath(db, alice.id, ['Archives']);
    const bobFolder = await ensureFolderPath(db, bob.id, ['Bob']);

    expect(await updateNote(db, alice.id, moved.id, { folderId: bobFolder.folderId })).toBeNull();
    await updateNote(db, alice.id, moved.id, { folderId: target.folderId });
    expect((await listNotesInFolder(db, alice.id, target.folderId)).map((row) => row.id)).toEqual([
      moved.id,
    ]);
  });

  it('never lets an account edit another account note', async () => {
    const alice = await createTestUser(db);
    const bob = await createTestUser(db);
    const secret = await note(bob, ['Privé'], 'Journal');
    expect(await updateNote(db, alice.id, secret.id, { content: 'piraté' })).toBeNull();
    expect((await findNote(db, bob.id, secret.id))?.content).toBe('avant');
    expect(await listNotesInFolder(db, alice.id, secret.folderId)).toEqual([]);
  });

  it('renames a folder and refuses a name already used next to it', async () => {
    const user = await createTestUser(db);
    const a = await ensureFolderPath(db, user.id, ['Cours', 'Réseau']);
    await ensureFolderPath(db, user.id, ['Cours', 'Système']);
    await expect(renameFolder(db, user.id, a.folderId, 'systeme')).rejects.toBeInstanceOf(
      FolderNameTakenError,
    );
    expect((await renameFolder(db, user.id, a.folderId, 'Réseaux'))?.name).toBe('Réseaux');
    const other = await createTestUser(db);
    expect(await renameFolder(db, other.id, a.folderId, 'Volé')).toBeNull();
  });

  it('counts notes per folder', async () => {
    const user = await createTestUser(db);
    await note(user, ['Perso'], 'a');
    await note(user, ['Perso'], 'b');
    const counts = await listFoldersWithCounts(db, user.id);
    expect(counts.find((folder) => folder.name === 'Perso')?.noteCount).toBe(2);
  });

  it('lists note rows without their content, for the account only', async () => {
    const alice = await createTestUser(db);
    const bob = await createTestUser(db);
    const first = await note(alice, ['Cours', 'Réseau'], 'DNS');
    await note(alice, ['Cours', 'Réseau'], 'DHCP');
    await note(bob, ['Cours', 'Réseau'], 'Chez Bob');

    const rows = await listNoteRowsInFolder(db, alice.id, first.folderId);
    expect(rows.map((row) => row.title).sort()).toEqual(['DHCP', 'DNS']);
    expect(rows[0]).not.toHaveProperty('content');
    expect(await listNoteRowsInFolder(db, bob.id, first.folderId)).toEqual([]);

    const recent = await listRecentNoteRows(db, alice.id, 1);
    expect(recent).toHaveLength(1);
    expect(recent[0]?.title).toBe('DHCP');
  });
});
