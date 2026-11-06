// What is being dragged in the explorer. Drop targets read it during `dragover`, when the
// browser hides the transferred data.
export interface Dragged {
  kind: 'note' | 'folder';
  id: string;
  label: string;
  // The folder a note is in, or the parent of a dragged folder.
  from: string | null;
}

let dragged: Dragged | null = null;

export function startDrag(next: Dragged): void {
  dragged = next;
}

export function currentDrag(): Dragged | null {
  return dragged;
}

export function endDrag(): void {
  dragged = null;
}
