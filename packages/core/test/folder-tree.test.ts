import { describe, expect, it } from 'vitest';
import { buildFolderPaths, samePath } from '../src/folder-tree';

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
