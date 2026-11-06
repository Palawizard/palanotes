import { describe, expect, it } from 'vitest';
import { buildFolderPaths, folderTotals, samePath, subtreeIds } from '../src/folder-tree';

describe('buildFolderPaths', () => {
  it('builds the path of nested folders', () => {
    const paths = buildFolderPaths([
      { id: 'reseau', parentId: 'cours', name: 'Réseau' },
      { id: 'cours', parentId: null, name: 'Cours' },
      { id: 'ipv6', parentId: 'reseau', name: 'IPv6' },
    ]);
    expect(paths.get('ipv6')).toEqual(['Cours', 'Réseau', 'IPv6']);
    expect(paths.get('cours')).toEqual(['Cours']);
  });

  it('treats a folder with a missing parent as a root and survives cycles', () => {
    const paths = buildFolderPaths([
      { id: 'orphan', parentId: 'gone', name: 'Orphelin' },
      { id: 'a', parentId: 'b', name: 'A' },
      { id: 'b', parentId: 'a', name: 'B' },
    ]);
    expect(paths.get('orphan')).toEqual(['Orphelin']);
    expect(paths.get('a')?.at(-1)).toBe('A');
  });
});

describe('samePath', () => {
  it('ignores case and accents, so the model cannot create near-duplicate folders', () => {
    expect(samePath(['Cours', 'réseau'], ['cours', 'Réseau'])).toBe(true);
    expect(samePath(['Cours', 'reseau'], ['Cours', 'Réseau'])).toBe(true);
    expect(samePath(['Cours', 'Réseau'], ['Cours'])).toBe(false);
    expect(samePath(['Cours', 'Réseaux'], ['Cours', 'Réseau'])).toBe(false);
  });
});

describe('folderTotals', () => {
  const folders = [
    { id: 'cours', parentId: null, name: 'Cours', noteCount: 0 },
    { id: 'reseau', parentId: 'cours', name: 'Réseau', noteCount: 3 },
    { id: 'tcp', parentId: 'reseau', name: 'TCP-IP', noteCount: 5 },
    { id: 'maths', parentId: 'cours', name: 'Maths', noteCount: 2 },
    { id: 'perso', parentId: null, name: 'Perso', noteCount: 1 },
  ];
  it('adds the notes of every subfolder', () => {
    const totals = folderTotals(folders);
    expect(totals.get('cours')).toBe(10);
    expect(totals.get('reseau')).toBe(8);
    expect(totals.get('tcp')).toBe(5);
    expect(totals.get('perso')).toBe(1);
  });
  it('survives a cycle', () => {
    const totals = folderTotals([
      { id: 'a', parentId: 'b', name: 'A', noteCount: 1 },
      { id: 'b', parentId: 'a', name: 'B', noteCount: 2 },
    ]);
    expect(totals.get('a')).toBeGreaterThanOrEqual(1);
  });
});

describe('subtreeIds', () => {
  it('lists the folder and all its descendants', () => {
    const folders = [
      { id: 'cours', parentId: null, name: 'Cours' },
      { id: 'reseau', parentId: 'cours', name: 'Réseau' },
      { id: 'tcp', parentId: 'reseau', name: 'TCP-IP' },
      { id: 'perso', parentId: null, name: 'Perso' },
    ];
    expect([...subtreeIds(folders, 'reseau')].sort()).toEqual(['reseau', 'tcp']);
    expect(subtreeIds(folders, 'perso')).toEqual(new Set(['perso']));
  });
});
