import { afterAll, describe, expect, it } from 'vitest';
import { closeDb } from '../src/client';
import { findUserById, setSortMode, upsertUser } from '../src/repo/users';
import { createTestDb } from './db';

const db = createTestDb();
afterAll(() => closeDb(db));

describe('upsertUser', () => {
  it('creates the user on first sign-in and updates the name afterwards', async () => {
    const first = await upsertUser(db, { authSubject: 'sub-upsert', displayName: 'Ancien nom' });
    const second = await upsertUser(db, { authSubject: 'sub-upsert', displayName: 'Nouveau nom' });

    expect(second.id).toBe(first.id);
    expect(second.displayName).toBe('Nouveau nom');
    expect(second.sortMode).toBe('review');
  });

  it('stores the sort mode per account', async () => {
    const user = await upsertUser(db, { authSubject: 'sub-mode', displayName: 'Mode' });
    await setSortMode(db, user.id, 'direct');
    expect((await findUserById(db, user.id))?.sortMode).toBe('direct');
  });
});
