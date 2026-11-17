import { redirect } from 'next/navigation';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { AppNav, SettingsLink } from '@/components/app-nav';
import { FolderMassing } from '@/components/folder-massing';
import { apiPath } from '@/lib/paths';
import { getCurrentUser } from '@/server/auth';
import { getDb } from '@/server/db';
import { loadFolderTree, type FolderItem } from '@/server/folders';

export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/api/auth/login');
  }
  const tree = await loadFolderTree(getDb(), user.id);
  const roots: FolderItem[] = tree.roots.map((folder) => ({
    id: folder.id,
    parentId: folder.parentId,
    name: folder.name,
    path: folder.path,
    noteCount: folder.noteCount,
    totalCount: folder.totalCount,
    hue: folder.hue,
  }));
  return (
    <div className="shell">
      <header className="rail">
        <Link className="rail-brand" href="/">
          <span className="rail-mark" aria-hidden="true" />
          Notes
        </Link>
        <AppNav />
        <div className="rail-binder">
          <FolderMassing roots={roots} />
        </div>
        <div className="rail-foot">
          <SettingsLink />
          <div className="rail-account">
            <span className="rail-user">{user.displayName}</span>
            <form action={apiPath('/api/auth/logout')} method="post">
              <button type="submit" className="rail-signout">
                Se déconnecter
              </button>
            </form>
          </div>
        </div>
      </header>
      <div className="page">
        <main className="main" id="contenu">
          {children}
        </main>
      </div>
    </div>
  );
}
