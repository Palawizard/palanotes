import type { NoteSort } from '@palanotes/core';

export interface ExplorerPlace {
  folderId?: string | null;
  note?: string | null;
  sort?: NoteSort;
  shown?: number;
}

// URL of a place in the explorer. Without a folder, the list is the recent notes.
// Default values stay out of the URL so links remain short and shareable.
export function explorerHref({ folderId, note, sort, shown }: ExplorerPlace): string {
  const params = new URLSearchParams();
  if (note) params.set('note', note);
  if (sort && sort !== 'modifiee') params.set('tri', sort);
  if (shown && shown > PAGE_SIZE) params.set('n', String(shown));
  const query = params.toString();
  return `${folderId ? `/dossiers/${folderId}` : '/dossiers/recents'}${query ? `?${query}` : ''}`;
}

export const PAGE_SIZE = 50;

export function parseShown(raw: unknown): number {
  const value = typeof raw === 'string' ? Number.parseInt(raw, 10) : Number.NaN;
  if (!Number.isFinite(value) || value <= PAGE_SIZE) return PAGE_SIZE;
  return Math.min(Math.ceil(value / PAGE_SIZE) * PAGE_SIZE, 1000);
}
