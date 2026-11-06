import { describe, expect, it } from 'vitest';
import { explorerHref, parseShown } from '@/lib/explorer-url';

describe('explorerHref', () => {
  it('leaves defaults out', () => {
    expect(explorerHref({ folderId: 'abc' })).toBe('/dossiers/abc');
    expect(explorerHref({ folderId: 'abc', sort: 'modifiee', shown: 50 })).toBe('/dossiers/abc');
  });
  it('keeps the open note, the sort and the page size', () => {
    expect(explorerHref({ folderId: 'abc', note: 'n1', sort: 'titre', shown: 100 })).toBe(
      '/dossiers/abc?note=n1&tri=titre&n=100',
    );
  });
  it('points to the recent notes without a folder', () => {
    expect(explorerHref({ note: 'n1' })).toBe('/dossiers/recents?note=n1');
  });
});

describe('parseShown', () => {
  it('rounds to whole pages and caps the size', () => {
    expect(parseShown(undefined)).toBe(50);
    expect(parseShown('abc')).toBe(50);
    expect(parseShown('70')).toBe(100);
    expect(parseShown('100')).toBe(100);
    expect(parseShown('99999')).toBe(1000);
  });
});
