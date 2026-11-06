import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { z } from 'zod';
import { listNotesInFolder } from '@palanotes/db';
import { FolderTree } from '@/components/folder-tree';
import { NoteList } from '@/components/note-list';
import { RenameFolder } from '@/components/rename-folder';
import { Breadcrumb } from '@/components/breadcrumb';
import { getCurrentUser } from '@/server/auth';
import { getDb } from '@/server/db';
import { loadFolderTree } from '@/server/folders';

export const metadata: Metadata = { title: 'Dossier' };

export default async function FolderPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  const id = z.uuid().safeParse((await params).id);
  if (!user || !id.success) {
    notFound();
  }
  const db = getDb();
  const [tree, notes] = await Promise.all([
    loadFolderTree(db, user.id),
    listNotesInFolder(db, user.id, id.data),
  ]);
  const folder = tree.byId.get(id.data);
  if (!folder) {
    notFound();
  }
  const trail = tree.ancestors(folder.id).slice(0, -1);

  return (
    <div className="browse">
      <div className="browse-side">
        <h2 className="section-title">
          <Link href="/dossiers">Dossiers</Link>
        </h2>
        <FolderTree roots={tree.roots} currentId={folder.id} />
      </div>
      <section className="browse-main" aria-labelledby="folder-title">
        <Breadcrumb
          items={[
            { label: 'Dossiers', href: '/dossiers' },
            ...trail.map((node) => ({ label: node.name, href: `/dossiers/${node.id}` })),
            { label: folder.name },
          ]}
        />
        <RenameFolder folderId={folder.id} name={folder.name} />
        {folder.children.length > 0 ? (
          <ul className="subfolders" aria-label="Sous-dossiers">
            {folder.children.map((child) => (
              <li key={child.id}>
                <Link href={`/dossiers/${child.id}`}>{child.name}</Link>
              </li>
            ))}
          </ul>
        ) : null}
        {notes.length > 0 ? (
          <NoteList notes={notes} />
        ) : (
          <p className="empty-state">Aucune note directement dans ce dossier.</p>
        )}
      </section>
    </div>
  );
}
