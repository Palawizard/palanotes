import { explorerHref } from './explorer-url';

// Restored is masculine for a folder, feminine for a note.
export function restoredText(restored: RestoredItem, oldName: string): string {
  if (restored.kind === 'note') {
    return restored.recreated
      ? `« ${oldName} » restaurée, dans son dossier recréé.`
      : `« ${oldName} » restaurée.`;
  }
  return restored.renamed
    ? `« ${oldName} » restauré sous le nom « ${restored.name} ».`
    : `« ${oldName} » restauré.`;
}

// What the restore API sends back.
export type RestoredItem =
  | { kind: 'folder'; folderId: string; name: string; renamed: boolean }
  | { kind: 'note'; noteId: string; folderId: string; name: string; recreated: boolean };

export function restoredHref(restored: RestoredItem): string {
  return restored.kind === 'note'
    ? explorerHref({ folderId: restored.folderId, note: restored.noteId })
    : `/dossiers/${restored.folderId}`;
}
