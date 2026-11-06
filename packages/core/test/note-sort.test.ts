import { describe, expect, it } from 'vitest';
import { parseNoteSort, sortNotes } from '../src/note-sort';

const day = (n: number) => new Date(Date.UTC(2026, 0, n));
const notes = [
  { title: 'Vocabulaire, leçon 10', createdAt: day(1), updatedAt: day(9) },
  { title: 'écrire un script', createdAt: day(3), updatedAt: day(3) },
  { title: 'Vocabulaire, leçon 2', createdAt: day(2), updatedAt: day(20) },
  { title: 'Algorithmes', createdAt: day(5), updatedAt: day(5) },
];

describe('sortNotes', () => {
  it('puts the last modified first by default', () => {
    expect(sortNotes(notes, 'modifiee').map((n) => n.title)).toEqual([
      'Vocabulaire, leçon 2',
      'Vocabulaire, leçon 10',
      'Algorithmes',
      'écrire un script',
    ]);
  });
  it('can sort by creation date', () => {
    expect(sortNotes(notes, 'creee').map((n) => n.title)[0]).toBe('Algorithmes');
  });
  it('sorts titles in French order with numbers in natural order', () => {
    expect(sortNotes(notes, 'titre').map((n) => n.title)).toEqual([
      'Algorithmes',
      'écrire un script',
      'Vocabulaire, leçon 2',
      'Vocabulaire, leçon 10',
    ]);
  });
  it('does not change the input', () => {
    const copy = [...notes];
    sortNotes(notes, 'titre');
    expect(notes).toEqual(copy);
  });
});

describe('parseNoteSort', () => {
  it('falls back to the last modified for anything unknown', () => {
    expect(parseNoteSort('titre')).toBe('titre');
    expect(parseNoteSort('drop table')).toBe('modifiee');
    expect(parseNoteSort(undefined)).toBe('modifiee');
  });
});
