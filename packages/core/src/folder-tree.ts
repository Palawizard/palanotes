export interface FolderNode {
  id: string;
  parentId: string | null;
  name: string;
}

// Path of every folder from the root, e.g. ['Cours', 'Réseau']. A folder whose parent is
// missing is treated as a root, so a broken row never hides its notes.
export function buildFolderPaths(folders: readonly FolderNode[]): Map<string, string[]> {
  const byId = new Map(folders.map((folder) => [folder.id, folder]));
  const paths = new Map<string, string[]>();

  const resolve = (folder: FolderNode, seen: Set<string>): string[] => {
    const known = paths.get(folder.id);
    if (known) {
      return known;
    }
    const parent = folder.parentId ? byId.get(folder.parentId) : undefined;
    const path =
      parent && !seen.has(parent.id)
        ? [...resolve(parent, new Set(seen).add(folder.id)), folder.name]
        : [folder.name];
    paths.set(folder.id, path);
    return path;
  };

  for (const folder of folders) {
    resolve(folder, new Set([folder.id]));
  }
  return paths;
}

export function samePath(a: readonly string[], b: readonly string[]): boolean {
  return (
    a.length === b.length &&
    a.every(
      (segment, index) =>
        segment.localeCompare(b[index] ?? '', 'fr', { sensitivity: 'base' }) === 0,
    )
  );
}
