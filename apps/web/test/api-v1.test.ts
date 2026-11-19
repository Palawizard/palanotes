import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import type { SortEntryJob } from '@palanotes/core';
import {
  closeDb,
  createPersonalToken,
  ensureFolderPath,
  findEntry,
  listPersonalTokens,
  revokePersonalToken,
  schema,
  type User,
} from '@palanotes/db';
import { createTestDb, createTestUser } from '@palanotes/db/testing';
import {
  createEntryHandler,
  listNotesHandler,
  parseLimit,
  searchHandler,
  type ApiDeps,
} from '@/server/api-v1';
import { RateLimiter } from '@/server/rate-limit';
import { entryLimiter } from '@/server/submit-entry';
import { TEST_DB } from './global-setup';

const db = createTestDb(TEST_DB);
afterAll(() => closeDb(db));

const ORIGIN = 'http://localhost:3100';
let queued: SortEntryJob[] = [];
let deps: ApiDeps;

beforeEach(() => {
  queued = [];
  deps = {
    db,
    basePath: '/notes',
    queue: async (job) => {
      queued.push(job);
    },
    limiter: new RateLimiter(60, 60_000),
    entryLimiter: new RateLimiter(30, 60_000),
  };
});

function get(path: string, token?: string, headers: Record<string, string> = {}): Request {
  return new Request(`${ORIGIN}/notes/api/v1${path}`, {
    headers: { ...(token ? { authorization: `Bearer ${token}` } : {}), ...headers },
  });
}

function post(body: unknown, token?: string): Request {
  return new Request(`${ORIGIN}/notes/api/v1/entries`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

async function addNote(owner: User, path: string[], title: string, content: string, at: string) {
  const { folderId } = await ensureFolderPath(db, owner.id, path);
  const [note] = await db
    .insert(schema.notes)
    .values({ userId: owner.id, folderId, title, content, summary: '', tags: [] })
    .returning();
  if (!note) throw new Error('no note');
  await db
    .update(schema.notes)
    .set({ updatedAt: new Date(at) })
    .where(eq(schema.notes.id, note.id));
  return { ...note, folderId };
}

let owner: User;
let other: User;
let token: string;
let otherToken: string;
let meeting: { id: string; folderId: string };
let osi: { id: string; folderId: string };

beforeAll(async () => {
  owner = await createTestUser(db, 'Palawi');
  other = await createTestUser(db, 'Autre');
  token = (await createPersonalToken(db, owner.id, 'Tableau de bord')).token;
  otherToken = (await createPersonalToken(db, other.id, 'Autre app')).token;
  osi = await addNote(
    owner,
    ['Cours', 'Réseau'],
    'Modèle OSI',
    'Les sept couches du modèle OSI, de la couche physique à la couche application.',
    '2026-11-10T09:00:00Z',
  );
  meeting = await addNote(
    owner,
    ['Travail', 'Réunions'],
    'Réunion du lundi',
    'Points : budget, planning, couches du réseau du bureau.',
    '2026-11-18T09:00:00Z',
  );
  await addNote(owner, ['Perso'], 'Courses', 'Lait, œufs, farine.', '2026-11-12T09:00:00Z');
  await addNote(
    other,
    ['Secret'],
    'Note de quelqu’un d’autre',
    'Le modèle OSI aussi, mais pas pour toi.',
    '2026-11-19T09:00:00Z',
  );
});

describe('authentication', () => {
  const routes: [
    string,
    (token?: string) => Request,
    (r: Request, d: ApiDeps) => Promise<Response>,
  ][] = [
    ['notes', (t) => get('/notes', t), listNotesHandler],
    ['search', (t) => get('/search?q=osi', t), searchHandler],
    ['entries', (t) => post({ content: 'Une idée' }, t), createEntryHandler],
  ];

  for (const [name, request, handler] of routes) {
    it(`${name} refuses a request without a token`, async () => {
      const response = await handler(request(), deps);
      expect(response.status).toBe(401);
      expect(await response.json()).toEqual({ error: 'unauthorized' });
    });

    it(`${name} refuses an unknown or malformed token`, async () => {
      for (const bad of ['pn_' + 'a'.repeat(43), 'not-a-token']) {
        const response = await handler(request(bad), deps);
        expect(response.status).toBe(401);
      }
    });

    it(`${name} refuses a revoked token`, async () => {
      const created = await createPersonalToken(db, owner.id, 'Révoqué');
      expect((await handler(request(created.token), deps)).status).toBeLessThan(300);
      await revokePersonalToken(db, owner.id, created.record.id);
      const response = await handler(request(created.token), deps);
      expect(response.status).toBe(401);
      expect(await response.json()).toEqual({ error: 'unauthorized' });
    });
  }

  it('ignores a session cookie', async () => {
    const response = await listNotesHandler(
      get('/notes', undefined, { cookie: 'palawi_notes_session=anything' }),
      deps,
    );
    expect(response.status).toBe(401);
  });

  it('only takes the Bearer scheme', async () => {
    const response = await listNotesHandler(
      get('/notes', undefined, { authorization: `Basic ${token}` }),
      deps,
    );
    expect(response.status).toBe(401);
    const lower = await listNotesHandler(
      get('/notes', undefined, { authorization: `bearer ${token}` }),
      deps,
    );
    expect(lower.status).toBe(200);
  });

  it('limits each token to 60 requests a minute', async () => {
    const created = await createPersonalToken(db, owner.id, 'Pressé');
    for (let index = 0; index < 60; index += 1) {
      expect((await listNotesHandler(get('/notes?limit=1', created.token), deps)).status).toBe(200);
    }
    const limited = await listNotesHandler(get('/notes?limit=1', created.token), deps);
    expect(limited.status).toBe(429);
    expect(await limited.json()).toEqual({ error: 'rate_limited' });
    expect((await listNotesHandler(get('/notes?limit=1', token), deps)).status).toBe(200);
  });

  it('records when a token was last used', async () => {
    const created = await createPersonalToken(db, other.id, 'Suivi');
    await listNotesHandler(get('/notes', created.token), deps);
    const listed = (await listPersonalTokens(db, other.id)).find(
      (item) => item.id === created.record.id,
    );
    expect(listed?.lastUsedAt).toBeInstanceOf(Date);
  });
});

describe('GET /api/v1/notes', () => {
  it('lists the latest notes of the token account, newest first, with a link back', async () => {
    const response = await listNotesHandler(get('/notes', token), deps);
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
    const { notes } = (await response.json()) as { notes: Record<string, string>[] };
    expect(notes.map((note) => note.title)).toEqual(['Réunion du lundi', 'Courses', 'Modèle OSI']);
    expect(notes[0]).toEqual({
      id: meeting.id,
      title: 'Réunion du lundi',
      folderPath: 'Travail / Réunions',
      updatedAt: '2026-11-18T09:00:00.000Z',
      path: `/notes/dossiers/${meeting.folderId}?note=${meeting.id}`,
    });
  });

  it('honours the limit and refuses one out of range', async () => {
    const response = await listNotesHandler(get('/notes?limit=1', token), deps);
    expect(((await response.json()) as { notes: unknown[] }).notes).toHaveLength(1);
    for (const bad of ['0', '51', 'abc', '2.5', '-1', '']) {
      const refused = await listNotesHandler(get(`/notes?limit=${bad}`, token), deps);
      expect(refused.status).toBe(400);
      expect(await refused.json()).toEqual({ error: 'invalid_request' });
    }
  });

  it('never shows another account notes', async () => {
    const response = await listNotesHandler(get('/notes?limit=50', otherToken), deps);
    const { notes } = (await response.json()) as { notes: { title: string }[] };
    expect(notes.map((note) => note.title)).toEqual(['Note de quelqu’un d’autre']);
  });
});

describe('GET /api/v1/search', () => {
  it('finds the token account notes with a plain excerpt', async () => {
    const response = await searchHandler(
      get(`/search?q=${encodeURIComponent('modele')}`, token),
      deps,
    );
    expect(response.status).toBe(200);
    const { notes } = (await response.json()) as { notes: Record<string, string>[] };
    expect(notes.map((note) => note.id)).toEqual([osi.id]);
    const [hit] = notes;
    expect(hit?.folderPath).toBe('Cours / Réseau');
    expect(hit?.path).toBe(`/notes/dossiers/${osi.folderId}?note=${osi.id}`);
    expect(hit?.updatedAt).toBe('2026-11-10T09:00:00.000Z');
    expect(hit?.excerpt).toContain('modèle OSI');
    expect(hit?.excerpt).not.toMatch(/[\u0001\u0002]/);
  });

  it('honours the limit', async () => {
    const response = await searchHandler(get('/search?q=couches&limit=1', token), deps);
    expect(((await response.json()) as { notes: unknown[] }).notes).toHaveLength(1);
  });

  it('refuses a missing, blank or too long query and a bad limit', async () => {
    for (const query of ['', '?q=', '?q=%20%20', `?q=${'a'.repeat(201)}`, '?q=osi&limit=51']) {
      const response = await searchHandler(get(`/search${query}`, token), deps);
      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({ error: 'invalid_request' });
    }
  });

  it('never finds another account notes', async () => {
    const response = await searchHandler(get('/search?q=osi', otherToken), deps);
    const { notes } = (await response.json()) as { notes: { title: string }[] };
    expect(notes.map((note) => note.title)).toEqual(['Note de quelqu’un d’autre']);
  });
});

describe('POST /api/v1/entries', () => {
  it('stores the raw text for the token account and queues it for filing', async () => {
    const content = 'Appeler le garage pour le contrôle technique\n\n- mardi matin';
    const response = await createEntryHandler(post({ content }, token), deps);
    expect(response.status).toBe(201);
    const { id } = (await response.json()) as { id: string };
    const entry = await findEntry(db, owner.id, id);
    expect(entry?.content).toBe(content);
    expect(entry?.status).toBe('pending');
    expect(await findEntry(db, other.id, id)).toBeNull();
    expect(queued).toEqual([{ entryId: id }]);
  });

  it('refuses what the app would refuse', async () => {
    for (const body of [
      {},
      { content: '' },
      { content: '   \n ' },
      { content: 42 },
      { content: 'a'.repeat(20_001) },
      'not json',
    ]) {
      const response = await createEntryHandler(post(body, token), deps);
      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({ error: 'invalid_request' });
    }
    expect(queued).toEqual([]);
  });

  it('counts entries per account, whichever token sends them', async () => {
    const user = await createTestUser(db, 'Bavard');
    const first = (await createPersonalToken(db, user.id, 'Premier')).token;
    const second = (await createPersonalToken(db, user.id, 'Second')).token;
    for (let index = 0; index < 30; index += 1) {
      const response = await createEntryHandler(
        post({ content: `Idée ${index}` }, index % 2 === 0 ? first : second),
        deps,
      );
      expect(response.status).toBe(201);
    }
    const limited = await createEntryHandler(post({ content: 'Une de trop' }, second), deps);
    expect(limited.status).toBe(429);
    expect(await limited.json()).toEqual({ error: 'rate_limited' });
    expect(queued).toHaveLength(30);
    // Reading stays possible: only new entries are limited per account.
    expect((await listNotesHandler(get('/notes', first), deps)).status).toBe(200);
    expect((await createEntryHandler(post({ content: 'Autre compte' }, token), deps)).status).toBe(
      201,
    );
  });

  it('shares its count with the writing page of the app', async () => {
    const user = await createTestUser(db, 'Partagé');
    const shared = (await createPersonalToken(db, user.id, 'Partagé')).token;
    const appLimiter = entryLimiter();
    expect(entryLimiter()).toBe(appLimiter);
    // Thirty entries typed in the app this minute.
    for (let index = 0; index < 30; index += 1) {
      expect(appLimiter.allow(user.id)).toBe(true);
    }
    const response = await createEntryHandler(post({ content: 'Une de plus' }, shared), {
      ...deps,
      entryLimiter: appLimiter,
    });
    expect(response.status).toBe(429);
  });

  it('accepts text up to 20000 characters', async () => {
    const response = await createEntryHandler(post({ content: 'a'.repeat(20_000) }, token), deps);
    expect(response.status).toBe(201);
  });
});

describe('parseLimit', () => {
  it('takes the default when missing', () => {
    expect(parseLimit(null, 10)).toBe(10);
    expect(parseLimit('50', 10)).toBe(50);
    expect(parseLimit('1', 10)).toBe(1);
    expect(parseLimit('050', 10)).toBe(50);
    expect(parseLimit('1e1', 10)).toBeNull();
  });
});
