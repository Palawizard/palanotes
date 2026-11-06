export const NOTE_SORTS = ['modifiee', 'creee', 'titre'] as const;
export type NoteSort = (typeof NOTE_SORTS)[number];

export interface SortableNote {
  title: string;
  createdAt: Date;
  updatedAt: Date;
}

export function parseNoteSort(raw: unknown): NoteSort {
  return NOTE_SORTS.find((sort) => sort === raw) ?? 'modifiee';
}

const collator = new Intl.Collator('fr', { sensitivity: 'base', numeric: true });

// Newest first for dates; titles in French order, accents and case ignored, numbers
// in natural order (« Leçon 2 » before « Leçon 10 »).
export function sortNotes<T extends SortableNote>(notes: readonly T[], sort: NoteSort): T[] {
  const byTitle = (a: T, b: T) => collator.compare(a.title, b.title);
  if (sort === 'titre') {
    return notes.toSorted(byTitle);
  }
  const key = sort === 'creee' ? 'createdAt' : 'updatedAt';
  return notes.toSorted((a, b) => b[key].getTime() - a[key].getTime() || byTitle(a, b));
}
