import type { Metadata } from 'next';
import Link from 'next/link';
import { countTrash } from '@palanotes/db';
import { RecentView } from '@/components/recent-view';
import { getCurrentUser } from '@/server/auth';
import { getDb } from '@/server/db';
import { loadFolderTree } from '@/server/folders';

export const metadata: Metadata = { title: 'Dossiers' };

export default async function FoldersPage({
  searchParams,
}: {
  searchParams: Promise<{ note?: string | string[] }>;
}) {
  const user = await getCurrentUser();
  if (!user) {
    return null;
  }
  const db = getDb();
  const [tree, trashCount] = await Promise.all([
    loadFolderTree(db, user.id),
    countTrash(db, user.id),
  ]);
  if (tree.roots.length === 0) {
    // Without folders the explorer has no tree, so the trash link must live here.
    return (
      <div className="page-stack">
        <h1 className="page-title">Dossiers</h1>
        {trashCount > 0 ? (
          <div className="empty-block">
            <p className="empty-state">
              Tu n’as plus aucun dossier, mais la corbeille en garde{' '}
              {trashCount > 1 ? `${trashCount}` : 'un'}.
            </p>
            <Link href="/dossiers/corbeille" className="button">
              Ouvrir la corbeille
            </Link>
          </div>
        ) : (
          <div className="empty-block">
            <p className="empty-state">Rien n’est encore rangé. Ta première note arrivera ici.</p>
            <Link href="/" className="button">
              Écrire une note
            </Link>
          </div>
        )}
      </div>
    );
  }
  return <RecentView userId={user.id} noteParam={(await searchParams).note} phoneLevel="folders" />;
}
