import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { closeDb } from '../src/client';
import { ensureFolderPath } from '../src/repo/folders';
import { updateNote } from '../src/repo/notes';
import { HIGHLIGHT_END, HIGHLIGHT_START, listTopTags, searchNotes } from '../src/repo/search';
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

  it('builds excerpts from plain sentences, without Markdown or tables', async () => {
    await add(
      user,
      ['Cours'],
      'Pare-feu',
      '# Pare-feu\n\n- un **alias** par réseau (`lan_admin`)\n- règles lues de haut en bas\n\n| Port | Usage |\n| --- | --- |\n| 22 | SSH |\n\n```sh\nnft list ruleset\n```',
    );
    const [hit] = await searchNotes(db, user.id, 'alias');
    expect(hit?.excerpt).not.toMatch(/[|*`#]/);
    expect(hit?.excerpt).toContain('lan_admin');
    expect(hit?.excerpt).toContain(' · ');
    expect(hit?.excerpt).not.toContain('nft list');
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

  it('does not match pieces of longer words', async () => {
    await add(user, ['Perso'], 'Forfait', 'Changer de forfait de téléphone avant la fin du mois.');
    expect(await searchNotes(db, user.id, 'xylophone')).toEqual([]);
    expect((await searchNotes(db, user.id, 'telephone')).map((hit) => hit.title)).toEqual([
      'Forfait',
    ]);
  });
});

describe('search filters', () => {
  let owner: User;
  let reseau: string;
  let tcp: string;

  beforeAll(async () => {
    owner = await createTestUser(db);
    const dns = await add(owner, ['Cours', 'Réseau'], 'DNS', 'Résolution des noms.', '', [
      'réseau',
      'dns',
    ]);
    reseau = dns.folderId;
    const handshake = await add(
      owner,
      ['Cours', 'Réseau', 'TCP'],
      'Poignée de main',
      'SYN, SYN-ACK, ACK : le réseau ouvre une connexion.',
      '',
      ['réseau', 'tcp'],
    );
    tcp = handshake.folderId;
    await add(owner, ['Perso'], 'Box internet', 'Le réseau de la maison tombe.', '', ['maison']);
    const old = await add(owner, ['Perso'], 'Vieux réseau', 'Réseau du lycée.', '', ['réseau']);
    await db
      .update(notes)
      .set({ updatedAt: new Date('2024-01-01T00:00:00Z') })
      .where(eq(notes.id, old.id));
  });

  it('narrows to a folder, with or without its subfolders', async () => {
    const alone = await searchNotes(db, owner.id, 'réseau', { folderIds: [reseau] });
    expect(alone.map((hit) => hit.title)).toEqual(['DNS']);
    const withSub = await searchNotes(db, owner.id, 'réseau', { folderIds: [reseau, tcp] });
    expect(withSub.map((hit) => hit.title).sort()).toEqual(['DNS', 'Poignée de main']);
  });

  it('keeps notes that carry every chosen tag', async () => {
    const hits = await searchNotes(db, owner.id, 'réseau', { tags: ['réseau', 'tcp'] });
    expect(hits.map((hit) => hit.title)).toEqual(['Poignée de main']);
  });

  it('keeps notes modified since a date', async () => {
    const hits = await searchNotes(db, owner.id, 'réseau', { since: new Date('2025-01-01') });
    expect(hits.map((hit) => hit.title)).not.toContain('Vieux réseau');
    expect(hits).toHaveLength(3);
  });

  it('lists the filtered notes newest first without a query', async () => {
    const hits = await searchNotes(db, owner.id, '', { tags: ['réseau'] });
    expect(hits.map((hit) => hit.title)).toHaveLength(3);
    expect(hits.at(-1)?.title).toBe('Vieux réseau');
    expect(hits[0]?.opening).toBeTruthy();
    expect(await searchNotes(db, owner.id, '', {})).toEqual([]);
  });

  it('counts the most used tags of the account', async () => {
    const tags = await listTopTags(db, owner.id);
    expect(tags[0]).toEqual({ tag: 'réseau', count: 3 });
    expect(tags.map((tag) => tag.tag)).toContain('dns');
  });
});
