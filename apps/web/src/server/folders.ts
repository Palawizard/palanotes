import 'server-only';
import { buildFolderPaths, formatFolderPath } from '@palanotes/core';
import { listFoldersWithCounts, type Db } from '@palanotes/db';

export interface FolderTreeNode {
  id: string;
  name: string;
  path: string;
  noteCount: number;
  children: FolderTreeNode[];
}

export interface FolderTree {
  roots: FolderTreeNode[];
  byId: Map<string, FolderTreeNode>;
  ancestors: (folderId: string) => FolderTreeNode[];
}

export async function loadFolderTree(db: Db, userId: string): Promise<FolderTree> {
  const folders = await listFoldersWithCounts(db, userId);
  const paths = buildFolderPaths(folders);
  const byId = new Map<string, FolderTreeNode>(
    folders.map((folder) => [
      folder.id,
      {
        id: folder.id,
        name: folder.name,
        path: formatFolderPath(paths.get(folder.id) ?? [folder.name]),
        noteCount: folder.noteCount,
        children: [],
      },
    ]),
  );
  const parents = new Map(folders.map((folder) => [folder.id, folder.parentId]));
  const roots: FolderTreeNode[] = [];
  for (const folder of folders) {
    const node = byId.get(folder.id);
    const parent = folder.parentId ? byId.get(folder.parentId) : undefined;
    if (!node) continue;
    if (parent) {
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  }
  const ancestors = (folderId: string): FolderTreeNode[] => {
    const chain: FolderTreeNode[] = [];
    let current: string | null | undefined = folderId;
    const seen = new Set<string>();
    while (current && !seen.has(current)) {
      seen.add(current);
      const node = byId.get(current);
      if (!node) break;
      chain.unshift(node);
      current = parents.get(current);
    }
    return chain;
  };
  return { roots, byId, ancestors };
}
