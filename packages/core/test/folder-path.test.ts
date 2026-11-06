import { describe, expect, it } from 'vitest';
import { formatFolderPath, parseFolderPath } from '../src/folder-path.js';

describe('parseFolderPath', () => {
  it('splits and trims segments', () => {
    expect(parseFolderPath(' Cours /  Réseau  / IPv4 ')).toEqual(['Cours', 'Réseau', 'IPv4']);
  });

  it('ignores empty segments', () => {
    expect(parseFolderPath('Cours//Réseau/')).toEqual(['Cours', 'Réseau']);
  });

  it('rejects an empty path', () => {
    expect(() => parseFolderPath(' / ')).toThrow();
  });

  it('rejects dot segments', () => {
    expect(() => parseFolderPath('Cours/../Perso')).toThrow();
  });

  it('rejects a path deeper than six levels', () => {
    expect(() => parseFolderPath('a/b/c/d/e/f/g')).toThrow();
  });
});

describe('formatFolderPath', () => {
  it('joins segments for display', () => {
    expect(formatFolderPath(['Cours', 'Réseau'])).toBe('Cours / Réseau');
  });
});
