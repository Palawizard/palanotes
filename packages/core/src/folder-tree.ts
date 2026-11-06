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

export interface CountedFolder extends FolderNode {
  noteCount: number;
}

// Number of notes in each folder and all its subfolders. A folder caught in a broken cycle
// counts its own notes only.
export function folderTotals(folders: readonly CountedFolder[]): Map<string, number> {
  const children = childrenByParent(folders);
  const totals = new Map<string, number>();
  const visit = (folder: CountedFolder, seen: Set<string>): number => {
    const known = totals.get(folder.id);
    if (known !== undefined) return known;
    let total = folder.noteCount;
    for (const child of children.get(folder.id) ?? []) {
      if (!seen.has(child.id)) {
        total += visit(child, new Set(seen).add(child.id));
      }
    }
    totals.set(folder.id, total);
    return total;
  };
  for (const folder of folders) {
    visit(folder, new Set([folder.id]));
  }
  return totals;
}

// The folder itself and every folder below it.
export function subtreeIds(folders: readonly FolderNode[], rootId: string): Set<string> {
  const children = childrenByParent(folders);
  const ids = new Set<string>();
  const stack = [rootId];
  while (stack.length > 0) {
    const id = stack.pop() as string;
    if (ids.has(id)) continue;
    ids.add(id);
    for (const child of children.get(id) ?? []) stack.push(child.id);
  }
  return ids;
}

function childrenByParent<T extends FolderNode>(folders: readonly T[]): Map<string, T[]> {
  const children = new Map<string, T[]>();
  for (const folder of folders) {
    if (!folder.parentId) continue;
    const list = children.get(folder.parentId) ?? [];
    list.push(folder);
    children.set(folder.parentId, list);
  }
  return children;
}
