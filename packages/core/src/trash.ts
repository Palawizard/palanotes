import { samePath } from './folder-tree';

export const TRASH_RETENTION_DAYS = 30;

// Name for a folder put back from the trash: its own name when it is free among its new
// siblings, otherwise "Name (restauré)", then "Name (restauré 2)", and so on.
export function restoredFolderName(name: string, siblingNames: readonly string[]): string {
  const taken = (candidate: string): boolean =>
    siblingNames.some((sibling) => samePath([sibling], [candidate]));
  if (!taken(name)) {
    return name;
  }
  for (let attempt = 1; ; attempt += 1) {
    const candidate = attempt === 1 ? `${name} (restauré)` : `${name} (restauré ${attempt})`;
    if (!taken(candidate)) {
      return candidate;
    }
  }
}

export function trashExpiresAt(deletedAt: Date): Date {
  return new Date(deletedAt.getTime() + TRASH_RETENTION_DAYS * 24 * 60 * 60 * 1000);
}
