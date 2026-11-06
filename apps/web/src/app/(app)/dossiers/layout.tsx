import { cookies } from 'next/headers';
import type { ReactNode } from 'react';
import { RecentLink } from '@/components/explorer-nav';
import { ExplorerShell, TreeHead } from '@/components/explorer-shell';
import { FolderActionsProvider } from '@/components/folder-actions';
import { FolderTree } from '@/components/folder-tree';
import { parseTreeCookie, TREE_COOKIE } from '@/lib/tree-cookie';
import { getCurrentUser } from '@/server/auth';
import { getDb } from '@/server/db';
import { flattenTree, loadFolderTree } from '@/server/folders';

// Left pane of the explorer. Layouts are kept across navigation, so the tree keeps its
// scroll position and open folders while the list and the note change.
export default async function ExplorerLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();
  if (!user) {
    return null;
  }
  const [tree, jar] = await Promise.all([loadFolderTree(getDb(), user.id), cookies()]);
  const items = flattenTree(tree);
  const savedOpen = parseTreeCookie(jar.get(TREE_COOKIE)?.value);
  if (items.length === 0) {
    return children;
  }
  return (
    <FolderActionsProvider folders={items}>
      <ExplorerShell>
        <nav className="explorer-tree" aria-labelledby="tree-title">
          <TreeHead />
          <div className="pane-scroll">
            <RecentLink />
            <FolderTree items={items} savedOpen={savedOpen} />
          </div>
        </nav>
        {children}
      </ExplorerShell>
    </FolderActionsProvider>
  );
}
