import { afterAll, describe, expect, it } from 'vitest';
import { buildFolderPaths } from '@palanotes/core';
import { closeDb } from '../src/client';
import { DEMO_FOLDERS, DemoAccountNotEmptyError, demoNotes, seedDemoAccount } from '../src/demo';
import { listFolders } from '../src/repo/folders';
import { listRecentEntries } from '../src/repo/entries';
import { listRecentNotes } from '../src/repo/notes';
import { searchNotes } from '../src/repo/search';
import { createTestDb, createTestUser } from './db';

const db = createTestDb();
afterAll(() => closeDb(db));

const DAY = 86_400_000;

describe('demo account', () => {
  it('describes enough folders and notes to stress the screens', () => {
    const now = new Date('2026-11-06T12:00:00Z');
    const notes = demoNotes(now);
    expect(notes.length).toBeGreaterThanOrEqual(300);
    expect(DEMO_FOLDERS.length).toBeGreaterThanOrEqual(40);
    expect(Math.max(...DEMO_FOLDERS.map((path) => path.split(' / ').length))).toBe(4);
    expect(new Set(notes.map((note) => note.path)).size).toBeGreaterThan(35);
    for (const note of notes) {
      expect(DEMO_FOLDERS, note.title).toContain(note.path);
    }
    const lengths = notes.map((note) => note.content.length);
    expect(Math.min(...lengths)).toBeLessThan(80);
    expect(Math.max(...lengths)).toBeGreaterThan(3000);
  });

  it('is the same on every load', () => {
    const now = new Date('2026-11-06T12:00:00Z');
    expect(demoNotes(now)).toEqual(demoNotes(now));
  });

  it('loads into an empty account with dates spread over a year', async () => {
    const user = await createTestUser(db);
    const now = new Date();
    const summary = await seedDemoAccount(db, user.id, now);
    expect(summary.notes).toBeGreaterThanOrEqual(300);

    const folders = await listFolders(db, user.id);
    expect(folders).toHaveLength(DEMO_FOLDERS.length);
    const paths = buildFolderPaths(folders);
    expect(Math.max(...[...paths.values()].map((path) => path.length))).toBe(4);

    const notes = await listRecentNotes(db, user.id, 1000);
    expect(notes).toHaveLength(summary.notes);
    const ages = notes.map((note) => (now.getTime() - note.createdAt.getTime()) / DAY);
    expect(Math.min(...ages)).toBeLessThan(7);
    expect(Math.max(...ages)).toBeGreaterThan(300);
    expect(Math.max(...ages)).toBeLessThan(367);
    expect(notes.every((note) => note.updatedAt >= note.createdAt)).toBe(true);
    expect(notes.every((note) => note.updatedAt <= now)).toBe(true);

    const entries = await listRecentEntries(db, user.id);
    expect(new Set(entries.map((entry) => entry.status))).toEqual(
      new Set(['proposed', 'applied', 'failed', 'rejected']),
    );

    const hits = await searchNotes(db, user.id, 'sous-réseaux');
    expect(hits.map((hit) => hit.title)).toContain('Adressage IPv4 et masques');
  });

  it('refuses an account that already has notes', async () => {
    const user = await createTestUser(db);
    await seedDemoAccount(db, user.id);
    await expect(seedDemoAccount(db, user.id)).rejects.toBeInstanceOf(DemoAccountNotEmptyError);
  });
});
