import { afterAll, describe, expect, it } from 'vitest';
import { closeDb } from '../src/client';
import {
  createEntry,
  findEntry,
  listRecentEntries,
  listStalePendingEntryIds,
  setEntryStatus,
} from '../src/repo/entries';
import { createTestDb, createTestUser } from './db';

const db = createTestDb();
afterAll(() => closeDb(db));

describe('entries', () => {
  it('lists only the account own entries, newest first', async () => {
    const alice = await createTestUser(db, 'Alice');
    const bob = await createTestUser(db, 'Bob');
    const first = await createEntry(db, alice.id, 'premier');
    const second = await createEntry(db, alice.id, 'second');
    await createEntry(db, bob.id, 'secret de Bob');

    const list = await listRecentEntries(db, alice.id);
    expect(list.map((entry) => entry.id)).toEqual([second.id, first.id]);
    expect(list.every((entry) => entry.userId === alice.id)).toBe(true);
  });

  it('does not let an account read another account entry', async () => {
    const alice = await createTestUser(db, 'Alice');
    const bob = await createTestUser(db, 'Bob');
    const secret = await createEntry(db, bob.id, 'secret');
    expect(await findEntry(db, alice.id, secret.id)).toBeNull();
    expect((await findEntry(db, bob.id, secret.id))?.content).toBe('secret');
  });

  it('finds pending entries left behind, not the ones being sorted', async () => {
    const user = await createTestUser(db);
    const pending = await createEntry(db, user.id, 'en attente');
    const processing = await createEntry(db, user.id, 'en cours');
    await setEntryStatus(db, processing.id, 'processing');

    const ids = await listStalePendingEntryIds(db, new Date(Date.now() + 1000));
    expect(ids).toContain(pending.id);
    expect(ids).not.toContain(processing.id);
  });
});
