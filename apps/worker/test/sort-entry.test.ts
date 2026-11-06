import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { parseSortPlan } from '@palanotes/core';
import {
  closeDb,
  createEntry,
  ensureFolderPath,
  findEntryById,
  schema,
  type User,
} from '@palanotes/db';
import { createTestDb, createTestUser } from '@palanotes/db/testing';
import { LlmError, type LlmClient, type LlmRequest } from '@palanotes/llm';
import { sortEntry } from '../src/sort-entry';
import { FIXTURES, type Fixture } from './fixtures';
import { TEST_DB } from './global-setup';

const db = createTestDb(TEST_DB);
afterAll(() => closeDb(db));

class ScriptedClient implements LlmClient {
  readonly mode = 'api' as const;
  requests: LlmRequest[] = [];
  constructor(private readonly answer: (request: LlmRequest) => unknown) {}
  async complete(request: LlmRequest) {
    this.requests.push(request);
    return {
      json: this.answer(request),
      mode: this.mode,
      model: 'scripted',
      inputTokens: 10,
      outputTokens: 5,
    };
  }
}

async function addNote(user: User, path: string[], title: string): Promise<string> {
  const { folderId } = await ensureFolderPath(db, user.id, path);
  const [note] = await db
    .insert(schema.notes)
    .values({ userId: user.id, folderId, title, content: `# ${title}`, summary: title, tags: [] })
    .returning();
  return note?.id ?? '';
}

function planFor(fixture: Fixture, noteIds: Record<string, string>) {
  const { plan } = fixture;
  const action =
    plan.type === 'create'
      ? { ...plan, summary: plan.title }
      : {
          type: 'append' as const,
          noteId: noteIds[plan.appendTo] ?? '',
          sectionTitle: plan.sectionTitle,
          content: plan.content,
          summary: plan.sectionTitle,
          tags: plan.tags,
        };
  return { explanation: 'Rangée.', actions: [action] };
}

describe('sortEntry with real French entries', () => {
  let user: User;
  const noteIds: Record<string, string> = {};

  beforeAll(async () => {
    user = await createTestUser(db, 'Palawi');
    noteIds.cours = await addNote(user, ['Cours', 'Réseau'], 'Modèle OSI');
    noteIds.courses = await addNote(user, ['Perso', 'Courses'], 'Liste de courses');
  });

  it.each(FIXTURES.map((fixture) => [fixture.name, fixture] as const))(
    '%s: stores a valid plan and leaves the raw text untouched',
    async (_name, fixture) => {
      const entry = await createEntry(db, user.id, fixture.entry);
      const client = new ScriptedClient(() => planFor(fixture, noteIds));

      const outcome = await sortEntry(
        { db, clientFor: () => ({ client }), log: () => undefined },
        entry.id,
      );

      expect(outcome).toBe('proposed');
      const prompt = client.requests[0]?.prompt ?? '';
      expect(prompt).toContain(fixture.entry);
      expect(prompt).toContain(noteIds.cours);
      expect(prompt).toContain('Cours / Réseau');

      const stored = await findEntryById(db, entry.id);
      expect(stored?.status).toBe('proposed');
      expect(stored?.content).toBe(fixture.entry);
      const [run] = await db
        .select()
        .from(schema.sortRuns)
        .where(eq(schema.sortRuns.entryId, entry.id));
      expect(parseSortPlan(run?.plan)).toEqual(parseSortPlan(planFor(fixture, noteIds)));
      expect(run).toMatchObject({ status: 'proposed', model: 'scripted', inputTokens: 10 });
    },
  );

  it('has at least ten fixtures, with appends and explicit filing hints', () => {
    expect(FIXTURES.length).toBeGreaterThanOrEqual(10);
    expect(FIXTURES.some((fixture) => fixture.plan.type === 'append')).toBe(true);
    expect(FIXTURES.some((fixture) => /à ranger avec|dans Perso/.test(fixture.entry))).toBe(true);
  });
});

describe('sortEntry failures', () => {
  async function run(answer: (request: LlmRequest) => unknown, user?: User) {
    const owner = user ?? (await createTestUser(db));
    const entry = await createEntry(db, owner.id, 'Note secrète de test');
    const logs: string[] = [];
    const client = new ScriptedClient(answer);
    const outcome = await sortEntry(
      { db, clientFor: () => ({ client }), log: (line) => logs.push(line) },
      entry.id,
    );
    const runs = await db
      .select()
      .from(schema.sortRuns)
      .where(eq(schema.sortRuns.entryId, entry.id));
    return { outcome, entry: await findEntryById(db, entry.id), runs, logs };
  }

  it('fails an invalid plan without storing anything', async () => {
    const result = await run(() => ({ actions: 'n’importe quoi' }));
    expect(result.outcome).toBe('failed');
    expect(result.entry?.status).toBe('failed');
    expect(result.entry?.error).toBe(
      'Le rangement proposé n’était pas valable. Relance le rangement.',
    );
    expect(result.runs).toHaveLength(0);
  });

  it('refuses to append to a note of another account', async () => {
    const bob = await createTestUser(db, 'Bob');
    const bobNote = await addNote(bob, ['Privé'], 'Journal de Bob');
    const result = await run(() => ({
      explanation: 'x',
      actions: [
        {
          type: 'append',
          noteId: bobNote,
          sectionTitle: 's',
          content: 'c',
          summary: 's',
          tags: [],
        },
      ],
    }));
    expect(result.outcome).toBe('failed');
    expect(result.runs).toHaveLength(0);
  });

  it('refuses a folder path that is too deep', async () => {
    const result = await run(() => ({
      explanation: 'x',
      actions: [
        {
          type: 'create',
          folderPath: 'a/b/c/d/e/f/g',
          title: 't',
          content: 'c',
          summary: 's',
          tags: [],
        },
      ],
    }));
    expect(result.outcome).toBe('failed');
  });

  it('shows the model error to the user and keeps the note text out of the logs', async () => {
    const result = await run(() => {
      throw new LlmError('Le service est saturé. Relance dans une minute.', 'api rate limited');
    });
    expect(result.entry?.error).toBe('Le service est saturé. Relance dans une minute.');
    expect(result.logs.join('\n')).toContain('api rate limited');
    expect(result.logs.join('\n')).not.toContain('Note secrète');
  });

  it('fails right away when the account has no model', async () => {
    const user = await createTestUser(db);
    const entry = await createEntry(db, user.id, 'x');
    const outcome = await sortEntry(
      {
        db,
        clientFor: () => ({
          client: null,
          reason: 'Le rangement automatique n’est pas activé pour ce compte.',
        }),
        log: () => undefined,
      },
      entry.id,
    );
    expect(outcome).toBe('failed');
    expect((await findEntryById(db, entry.id))?.error).toBe(
      'Le rangement automatique n’est pas activé pour ce compte.',
    );
  });

  it('skips an entry that was already sorted', async () => {
    const first = await run(() => ({
      explanation: 'x',
      actions: [
        { type: 'create', folderPath: 'Divers', title: 't', content: 'c', summary: 's', tags: [] },
      ],
    }));
    expect(first.outcome).toBe('proposed');
    const again = await sortEntry(
      { db, clientFor: () => ({ client: null, reason: '' }), log: () => undefined },
      first.entry?.id ?? '',
    );
    expect(again).toBe('skipped');
  });
});

describe('sortEntry in direct mode', () => {
  it('applies the plan right away', async () => {
    const user = await createTestUser(db);
    await db.update(schema.users).set({ sortMode: 'direct' }).where(eq(schema.users.id, user.id));
    const direct = { ...user, sortMode: 'direct' as const };
    const entry = await createEntry(db, direct.id, 'Lait, œufs\nà ranger avec les courses');
    const client = new ScriptedClient(() => ({
      explanation: 'x',
      actions: [
        {
          type: 'create',
          folderPath: 'Courses',
          title: 'Lait',
          content: '- Lait\n- Œufs',
          summary: 's',
          tags: [],
        },
      ],
    }));
    const outcome = await sortEntry(
      { db, clientFor: () => ({ client }), log: () => undefined },
      entry.id,
    );
    expect(outcome).toBe('applied');
    expect((await findEntryById(db, entry.id))?.status).toBe('applied');
    const filed = await db.select().from(schema.notes).where(eq(schema.notes.userId, direct.id));
    expect(filed.map((note) => note.title)).toEqual(['Lait']);
  });
});
