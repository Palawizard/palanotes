import 'server-only';
import { cache } from 'react';
import { buildFolderPaths, folderTotals, formatFolderPath } from '@palanotes/core';
import { listFoldersWithCounts, type Db } from '@palanotes/db';

export interface FolderTreeNode {
  id: string;
  parentId: string | null;
  name: string;
  path: string;
  noteCount: number;
  totalCount: number;
  children: FolderTreeNode[];
}

export interface FolderTree {
  roots: FolderTreeNode[];
  byId: Map<string, FolderTreeNode>;
  ancestors: (folderId: string) => FolderTreeNode[];
}

// What the client tree needs, flat and in display order (parents before children).
export interface FolderItem {
  id: string;
  parentId: string | null;
  name: string;
  path: string;
  noteCount: number;
  totalCount: number;
}

const collator = new Intl.Collator('fr', { sensitivity: 'base', numeric: true });

// Cached per request: the explorer layout and its page both need the tree.
export const loadFolderTree = cache(async (db: Db, userId: string): Promise<FolderTree> => {
  const folders = await listFoldersWithCounts(db, userId);
  const paths = buildFolderPaths(folders);
  const totals = folderTotals(folders);
  const byId = new Map<string, FolderTreeNode>(
    folders.map((folder) => [
      folder.id,
      {
        id: folder.id,
        parentId: folder.parentId,
        name: folder.name,
        path: formatFolderPath(paths.get(folder.id) ?? [folder.name]),
        noteCount: folder.noteCount,
        totalCount: totals.get(folder.id) ?? folder.noteCount,
        children: [],
      },
    ]),
  );
  const roots: FolderTreeNode[] = [];
  for (const node of byId.values()) {
    const parent = node.parentId ? byId.get(node.parentId) : undefined;
    if (parent && parent !== node) {
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  }
  const byName = (a: FolderTreeNode, b: FolderTreeNode) => collator.compare(a.name, b.name);
  roots.sort(byName);
  for (const node of byId.values()) node.children.sort(byName);

  const ancestors = (folderId: string): FolderTreeNode[] => {
    const chain: FolderTreeNode[] = [];
    let current: string | null | undefined = folderId;
    const seen = new Set<string>();
    while (current && !seen.has(current)) {
      seen.add(current);
      const node = byId.get(current);
      if (!node) break;
      chain.unshift(node);
      current = node.parentId;
    }
    return chain;
  };
  return { roots, byId, ancestors };
});

export function flattenTree(tree: FolderTree): FolderItem[] {
  const items: FolderItem[] = [];
  const seen = new Set<string>();
  const walk = (nodes: FolderTreeNode[]) => {
    for (const node of nodes) {
      if (seen.has(node.id)) continue;
      seen.add(node.id);
      items.push({
        id: node.id,
        parentId: node.parentId,
        name: node.name,
        path: node.path,
        noteCount: node.noteCount,
        totalCount: node.totalCount,
      });
      walk(node.children);
    }
  };
  walk(tree.roots);
  return items;
}
