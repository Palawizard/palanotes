import { afterAll, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import type { SortPlan } from '@palanotes/core';
import { closeDb } from '../src/client';
import {
  applySortRun,
  FilingError,
  prepareRetry,
  rejectSortRun,
  undoSortRun,
} from '../src/repo/apply';
import { createEntry, findEntryById, setEntryStatus } from '../src/repo/entries';
import { ensureFolderPath, listFolders } from '../src/repo/folders';
import { findNote } from '../src/repo/notes';
import { createSortRun, findSortRun } from '../src/repo/sort-runs';
import { notes, noteVersions } from '../src/schema';
import type { User } from '../src/repo/users';
import { createTestDb, createTestUser } from './db';

const db = createTestDb();
afterAll(() => closeDb(db));

async function existingNote(user: User) {
  const { folderId } = await ensureFolderPath(db, user.id, ['Cours', 'Réseau']);
  const [note] = await db
    .insert(notes)
    .values({
      userId: user.id,
      folderId,
      title: 'Modèle OSI',
      content: '# Modèle OSI\n\nSept couches.',
      summary: 'Les couches OSI.',
      tags: ['réseau'],
    })
    .returning();
  if (!note) throw new Error('no note');
  return note;
}

async function proposed(user: User, plan: SortPlan, text = 'texte brut') {
  const entry = await createEntry(db, user.id, text);
  const run = await createSortRun(db, {
    userId: user.id,
    entryId: entry.id,
    plan,
    llmMode: 'api',
    model: 'test',
    inputTokens: null,
    outputTokens: null,
  });
  await setEntryStatus(db, entry.id, 'proposed');
  return { entry, run };
}

describe('applySortRun and undoSortRun', () => {
  it('creates folders and notes, appends sections, then undoes everything', async () => {
    const user = await createTestUser(db);
    const osi = await existingNote(user);
    const { entry, run } = await proposed(
      user,
      {
        explanation: 'x',
        actions: [
          {
            type: 'create',
            folderPath: 'Perso / Courses',
            title: 'Courses',
            content: '- Lait',
            summary: 'Liste.',
            tags: ['courses'],
          },
          {
            type: 'append',
            noteId: osi.id,
            sectionTitle: 'Transport',
            content: 'La couche transport segmente.',
            summary: 'Les couches OSI et le transport.',
            tags: ['réseau', 'transport'],
          },
        ],
      },
      'lait + transport',
    );

    const changes = await applySortRun(db, user.id, run.id);
    expect(changes.createdNoteIds).toHaveLength(1);
    expect(changes.createdFolderIds).toHaveLength(2);
    const extended = await findNote(db, user.id, osi.id);
    expect(extended?.content).toBe(
      '# Modèle OSI\n\nSept couches.\n\n## Transport\n\nLa couche transport segmente.\n',
    );
    expect(extended?.tags).toEqual(['réseau', 'transport']);
    expect((await findEntryById(db, entry.id))?.status).toBe('applied');
    const versions = await db.select().from(noteVersions).where(eq(noteVersions.sortRunId, run.id));
    expect(versions.map((version) => version.kind).sort()).toEqual(['before_append', 'created']);

    await undoSortRun(db, user.id, run.id);
    const restored = await findNote(db, user.id, osi.id);
    expect(restored).toMatchObject({
      content: '# Modèle OSI\n\nSept couches.',
      summary: 'Les couches OSI.',
      tags: ['réseau'],
    });
    expect(await findNote(db, user.id, changes.createdNoteIds[0] ?? '')).toBeNull();
    expect((await listFolders(db, user.id)).map((folder) => folder.name).sort()).toEqual([
      'Cours',
      'Réseau',
    ]);
    expect((await findSortRun(db, user.id, run.id))?.status).toBe('undone');
    const entryAfter = await findEntryById(db, entry.id);
    expect(entryAfter?.status).toBe('proposed');
    expect(entryAfter?.content).toBe('lait + transport');
  });

  it('can apply a run again after undo, but never twice in a row', async () => {
    const user = await createTestUser(db);
    const { run } = await proposed(user, {
      explanation: 'x',
      actions: [
        { type: 'create', folderPath: 'Divers', title: 't', content: 'c', summary: 's', tags: [] },
      ],
    });
    await applySortRun(db, user.id, run.id);
    await expect(applySortRun(db, user.id, run.id)).rejects.toBeInstanceOf(FilingError);
    await undoSortRun(db, user.id, run.id);
    await expect(applySortRun(db, user.id, run.id)).resolves.toMatchObject({
      createdNoteIds: [expect.any(String)],
    });
  });

  it('refuses to undo when a note changed after the filing', async () => {
    const user = await createTestUser(db);
    const { run } = await proposed(user, {
      explanation: 'x',
      actions: [
        { type: 'create', folderPath: 'Divers', title: 't', content: 'c', summary: 's', tags: [] },
      ],
    });
    const changes = await applySortRun(db, user.id, run.id);
    await db
      .update(notes)
      .set({ content: 'modifiée à la main', updatedAt: new Date(Date.now() + 1000) })
      .where(eq(notes.id, changes.createdNoteIds[0] ?? ''));
    await expect(undoSortRun(db, user.id, run.id)).rejects.toThrow('modifiée depuis ce rangement');
  });

  it('keeps a folder that received another note in the meantime', async () => {
    const user = await createTestUser(db);
    const { run } = await proposed(user, {
      explanation: 'x',
      actions: [
        { type: 'create', folderPath: 'Projets', title: 'a', content: 'c', summary: 's', tags: [] },
      ],
    });
    const changes = await applySortRun(db, user.id, run.id);
    await db.insert(notes).values({
      userId: user.id,
      folderId: changes.createdFolderIds[0] ?? '',
      title: 'autre',
      content: 'c',
      summary: 's',
    });
    await undoSortRun(db, user.id, run.id);
    expect((await listFolders(db, user.id)).map((folder) => folder.name)).toEqual(['Projets']);
  });

  it('never applies, undoes or rejects another account run', async () => {
    const alice = await createTestUser(db);
    const bob = await createTestUser(db);
    const { run } = await proposed(alice, {
      explanation: 'x',
      actions: [
        { type: 'create', folderPath: 'Divers', title: 't', content: 'c', summary: 's', tags: [] },
      ],
    });
    await expect(applySortRun(db, bob.id, run.id)).rejects.toThrow('n’existe plus');
    await expect(rejectSortRun(db, bob.id, run.id)).rejects.toThrow('n’existe plus');
    await applySortRun(db, alice.id, run.id);
    await expect(undoSortRun(db, bob.id, run.id)).rejects.toThrow('n’existe plus');
  });

  it('rejecting keeps the raw entry', async () => {
    const user = await createTestUser(db);
    const { entry, run } = await proposed(
      user,
      {
        explanation: 'x',
        actions: [
          {
            type: 'create',
            folderPath: 'Divers',
            title: 't',
            content: 'c',
            summary: 's',
            tags: [],
          },
        ],
      },
      'à garder',
    );
    await rejectSortRun(db, user.id, run.id);
    expect(await findEntryById(db, entry.id)).toMatchObject({
      status: 'rejected',
      content: 'à garder',
    });
  });
});

describe('prepareRetry', () => {
  it('sets the pending proposal aside and requeues the entry', async () => {
    const user = await createTestUser(db);
    const { entry, run } = await proposed(user, {
      explanation: 'x',
      actions: [
        { type: 'create', folderPath: 'Divers', title: 't', content: 'c', summary: 's', tags: [] },
      ],
    });
    await prepareRetry(db, user.id, entry.id);
    expect((await findEntryById(db, entry.id))?.status).toBe('pending');
    expect((await findSortRun(db, user.id, run.id))?.status).toBe('rejected');
    await expect(prepareRetry(db, user.id, entry.id)).rejects.toThrow('déjà en cours');
  });

  it('refuses an applied entry', async () => {
    const user = await createTestUser(db);
    const { entry, run } = await proposed(user, {
      explanation: 'x',
      actions: [
        { type: 'create', folderPath: 'Divers', title: 't', content: 'c', summary: 's', tags: [] },
      ],
    });
    await applySortRun(db, user.id, run.id);
    await expect(prepareRetry(db, user.id, entry.id)).rejects.toThrow('Annule d’abord');
  });
});
