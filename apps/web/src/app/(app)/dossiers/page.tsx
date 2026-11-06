import type { Metadata } from 'next';
import Link from 'next/link';
import { listRecentNotes } from '@palanotes/db';
import { FolderTree } from '@/components/folder-tree';
import { NoteList } from '@/components/note-list';
import { getCurrentUser } from '@/server/auth';
import { getDb } from '@/server/db';
import { loadFolderTree } from '@/server/folders';

export const metadata: Metadata = { title: 'Dossiers' };

export default async function FoldersPage() {
  const user = await getCurrentUser();
  if (!user) {
    return null;
  }
  const db = getDb();
  const [tree, recent] = await Promise.all([
    loadFolderTree(db, user.id),
    listRecentNotes(db, user.id),
  ]);
  if (tree.roots.length === 0) {
    return (
      <div className="page-stack">
        <h1 className="page-title">Dossiers</h1>
        <p className="empty-state">
          Rien n’est encore rangé. <Link href="/">Écris ta première note</Link>, elle arrivera ici.
        </p>
      </div>
    );
  }
  const paths = new Map([...tree.byId.values()].map((node) => [node.id, node.path]));
  return (
    <div className="browse">
      <div className="browse-side">
        <h1 className="page-title">Dossiers</h1>
        <FolderTree roots={tree.roots} currentId={null} />
      </div>
      <section className="browse-main" aria-labelledby="recent-title">
        <h2 className="section-title" id="recent-title">
          Modifiées récemment
        </h2>
        <NoteList notes={recent} folderPaths={paths} />
      </section>
    </div>
  );
}
