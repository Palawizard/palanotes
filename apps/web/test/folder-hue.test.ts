import { describe, expect, it } from 'vitest';
import { folderHue, HUE_COUNT, pathHue, rootHues, type HueFolder } from '@/lib/folder-hue';

const day = (n: number) => new Date(Date.UTC(2026, 0, n));

const folders: HueFolder[] = [
  { id: 'perso', parentId: null, name: 'Perso', createdAt: day(3) },
  { id: 'cours', parentId: null, name: 'Cours', createdAt: day(1) },
  { id: 'reseau', parentId: 'cours', name: 'Réseau', createdAt: day(2) },
  { id: 'tcp', parentId: 'reseau', name: 'TCP-IP', createdAt: day(4) },
  { id: 'idees', parentId: null, name: 'Idées en vrac', createdAt: day(5) },
];
const byId = new Map(folders.map((folder) => [folder.id, folder]));

describe('rootHues', () => {
  it('numbers the top-level folders in creation order', () => {
    const hues = rootHues(folders);
    expect([...hues.entries()]).toEqual([
      ['cours', 0],
      ['perso', 1],
      ['idees', 2],
    ]);
  });

  it('keeps the existing colours when a folder is added', () => {
    const before = rootHues(folders);
    const after = rootHues([
      ...folders,
      { id: 'projets', parentId: null, name: 'Projets', createdAt: day(9) },
    ]);
    for (const [id, hue] of before) expect(after.get(id)).toBe(hue);
    expect(after.get('projets')).toBe(3);
  });

  it('wraps around once every colour is taken', () => {
    const many = Array.from({ length: HUE_COUNT + 1 }, (_, index) => ({
      id: `f${index}`,
      parentId: null,
      name: `Dossier ${index}`,
      createdAt: day(index + 1),
    }));
    expect(rootHues(many).get(`f${HUE_COUNT}`)).toBe(0);
  });

  it('breaks ties on the creation date by id', () => {
    const tied = rootHues([
      { id: 'b', parentId: null, name: 'B', createdAt: day(1) },
      { id: 'a', parentId: null, name: 'A', createdAt: day(1) },
    ]);
    expect(tied.get('a')).toBe(0);
    expect(tied.get('b')).toBe(1);
  });
});

describe('folderHue', () => {
  const hues = rootHues(folders);

  it('gives a sub-folder the colour of its top-level folder', () => {
    expect(folderHue('tcp', byId, hues)).toBe(0);
    expect(folderHue('perso', byId, hues)).toBe(1);
  });

  it('returns null for an unknown folder or a parent loop', () => {
    expect(folderHue('missing', byId, hues)).toBeNull();
    const loop = new Map([
      ['x', { parentId: 'y' }],
      ['y', { parentId: 'x' }],
    ]);
    expect(folderHue('x', loop, hues)).toBeNull();
  });
});

describe('pathHue', () => {
  const hues = rootHues(folders);

  it('matches the first part of a path, ignoring case and accents', () => {
    expect(pathHue('Cours / Réseau / TCP-IP', folders, hues)).toBe(0);
    expect(pathHue('idees en vrac', folders, hues)).toBe(2);
  });

  it('returns null for a top-level folder that does not exist yet', () => {
    expect(pathHue('Voyages / Japon', folders, hues)).toBeNull();
    expect(pathHue('', folders, hues)).toBeNull();
  });
});
