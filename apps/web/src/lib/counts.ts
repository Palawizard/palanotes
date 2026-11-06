export function notes(count: number): string {
  return `${count} note${count > 1 ? 's' : ''}`;
}

export function subfolders(count: number): string {
  return `${count} sous-dossier${count > 1 ? 's' : ''}`;
}

// What a deleted folder holds, as one phrase: « 3 notes et 1 sous-dossier ».
export function held(noteCount: number, folderCount: number): string {
  if (noteCount > 0 && folderCount > 0) return `${notes(noteCount)} et ${subfolders(folderCount)}`;
  if (folderCount > 0) return subfolders(folderCount);
  return notes(noteCount);
}
