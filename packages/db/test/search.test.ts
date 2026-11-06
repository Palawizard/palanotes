import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { closeDb } from '../src/client';
import { ensureFolderPath } from '../src/repo/folders';
import { updateNote } from '../src/repo/notes';
import { HIGHLIGHT_END, HIGHLIGHT_START, searchNotes } from '../src/repo/search';
import { notes } from '../src/schema';
import type { User } from '../src/repo/users';
import { createTestDb, createTestUser } from './db';

const db = createTestDb();
afterAll(() => closeDb(db));

let user: User;
let osiId: string;

async function add(
  owner: User,
  path: string[],
  title: string,
  content: string,
  summary = '',
  tags: string[] = [],
) {
  const { folderId } = await ensureFolderPath(db, owner.id, path);
  const [note] = await db
    .insert(notes)
    .values({ userId: owner.id, folderId, title, content, summary, tags })
    .returning();
  if (!note) throw new Error('no note');
  return note;
}

beforeAll(async () => {
  user = await createTestUser(db);
  // Filed in the wrong folder on purpose: search must not depend on folders.
  const osi = await add(
    user,
    ['Cuisine'],
    'Modèle OSI',
    'Le modèle OSI découpe le réseau en sept couches. La couche transport assure la fiabilité avec TCP.',
    'Les sept couches du modèle OSI.',
    ['réseau'],
  );
  osiId = osi.id;
  await add(
    user,
    ['Cuisine'],
    'Pâte à crêpes',
    'Farine, œufs, lait. Laisser reposer une heure.',
    'Recette des crêpes.',
  );
  await add(user, ['Perso'], 'Rendez-vous dentiste', 'Mardi à 14 h 30 chez le docteur Martin.');
});

describe('searchNotes', () => {
  it.each([
    ['its exact words', 'modèle OSI'],
    ['words without accents', 'modele osi'],
    ['upper case and accents mixed', 'MODÈLE'],
    ['a word from the content in another form', 'couche'],
    ['a content word without its accent', 'fiabilite'],
    ['a typo', 'modle osi'],
    ['another typo', 'reseua'],
    ['a tag', 'réseau'],
    ['several words with one typo', 'reseua osi'],
    ['several words with typos in each', 'modle coches'],
    ['words in another order', 'osi modèle'],
  ])('finds a note filed in the wrong folder by %s', async (_label, query) => {
    const hits = await searchNotes(db, user.id, query);
    expect(hits[0]?.id).toBe(osiId);
  });

  it('highlights matched words in the excerpt', async () => {
    const [hit] = await searchNotes(db, user.id, 'transport');
    expect(hit?.excerpt).toContain(`${HIGHLIGHT_START}transport${HIGHLIGHT_END}`);
  });

  it('keeps the index up to date when a note is edited', async () => {
    const note = await add(user, ['Divers'], 'Brouillon', 'rien de spécial');
    expect(await searchNotes(db, user.id, 'kubernetes')).toEqual([]);
    await updateNote(db, user.id, note.id, { content: 'Déployer sur Kubernetes avec Helm' });
    expect((await searchNotes(db, user.id, 'kubernetes')).map((hit) => hit.id)).toEqual([note.id]);
  });

  it('never returns another account notes', async () => {
    const other = await createTestUser(db);
    await add(other, ['Cours'], 'Modèle OSI de Bob', 'Le modèle OSI selon Bob.');
    const hits = await searchNotes(db, user.id, 'modèle osi');
    expect(hits.every((hit) => hit.id !== undefined)).toBe(true);
    const ids = new Set(hits.map((hit) => hit.id));
    const bobs = await db.select({ id: notes.id }).from(notes).where(eq(notes.userId, other.id));
    expect(bobs.some((note) => ids.has(note.id))).toBe(false);
  });

  it('needs every word of the query to match something', async () => {
    expect(await searchNotes(db, user.id, 'modèle xylophone')).toEqual([]);
  });

  it('returns nothing for an empty or unrelated query', async () => {
    expect(await searchNotes(db, user.id, '   ')).toEqual([]);
    expect(await searchNotes(db, user.id, 'xylophone')).toEqual([]);
  });
});
