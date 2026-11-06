import { describe, expect, it } from 'vitest';
import { restoredFolderName, trashExpiresAt } from '../src/trash';

describe('restoredFolderName', () => {
  it('keeps the name when no sibling uses it', () => {
    expect(restoredFolderName('Réseau', ['Systèmes', 'Maths'])).toBe('Réseau');
  });

  it('adds a suffix when a sibling has the same name, ignoring case and accents', () => {
    expect(restoredFolderName('Réseau', ['reseau'])).toBe('Réseau (restauré)');
  });

  it('counts up while the suffixed names are taken too', () => {
    expect(restoredFolderName('Réseau', ['Réseau', 'Réseau (restauré)'])).toBe(
      'Réseau (restauré 2)',
    );
    expect(
      restoredFolderName('Réseau', ['Réseau', 'Réseau (restauré)', 'Réseau (restauré 2)']),
    ).toBe('Réseau (restauré 3)');
  });
});

describe('trashExpiresAt', () => {
  it('is thirty days after the deletion', () => {
    expect(trashExpiresAt(new Date('2026-11-06T15:00:00Z')).toISOString()).toBe(
      '2026-12-06T15:00:00.000Z',
    );
  });
});
