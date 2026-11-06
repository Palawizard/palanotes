import type { Metadata } from 'next';
import Link from 'next/link';
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
  const tree = await loadFolderTree(getDb(), user.id);
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
  return <RecentView userId={user.id} noteParam={(await searchParams).note} phoneLevel="folders" />;
}
