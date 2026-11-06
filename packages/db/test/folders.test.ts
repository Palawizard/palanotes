import { afterAll, describe, expect, it } from 'vitest';
import { closeDb } from '../src/client';
import { ensureFolderPath, listFolders } from '../src/repo/folders';
import { createTestDb, createTestUser } from './db';

const db = createTestDb();
afterAll(() => closeDb(db));

describe('ensureFolderPath', () => {
  it('creates missing levels once and reuses existing ones regardless of case and accents', async () => {
    const user = await createTestUser(db);
    const first = await ensureFolderPath(db, user.id, ['Cours', 'Réseau']);
    expect(first.created).toHaveLength(2);

    const again = await ensureFolderPath(db, user.id, ['cours', 'reseau']);
    expect(again.folderId).toBe(first.folderId);
    expect(again.created).toHaveLength(0);

    const deeper = await ensureFolderPath(db, user.id, ['Cours', 'Réseau', 'IPv6']);
    expect(deeper.created).toHaveLength(1);
    expect(await listFolders(db, user.id)).toHaveLength(3);
  });

  it('keeps each account folders apart', async () => {
    const alice = await createTestUser(db);
    const bob = await createTestUser(db);
    const a = await ensureFolderPath(db, alice.id, ['Perso']);
    const b = await ensureFolderPath(db, bob.id, ['Perso']);
    expect(a.folderId).not.toBe(b.folderId);
  });
});
