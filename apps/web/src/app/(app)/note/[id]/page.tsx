import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { z } from 'zod';
import { findNote } from '@palanotes/db';
import { Breadcrumb } from '@/components/breadcrumb';
import { BackLink } from '@/components/explorer';
import { safeReturn } from '@/lib/search-url';
import { NoteView } from '@/components/note-view';
import { getCurrentUser } from '@/server/auth';
import { getDb } from '@/server/db';
import { flattenTree, loadFolderTree } from '@/server/folders';
import { FolderActionsProvider } from '@/components/folder-actions';

export const metadata: Metadata = { title: 'Note' };

export default async function NotePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ depuis?: string | string[] }>;
}) {
  const user = await getCurrentUser();
  const id = z.uuid().safeParse((await params).id);
  if (!user || !id.success) {
    notFound();
  }
  const db = getDb();
  const [note, tree] = await Promise.all([
    findNote(db, user.id, id.data),
    loadFolderTree(db, user.id),
  ]);
  if (!note) {
    notFound();
  }
  const trail = tree.ancestors(note.folderId);
  const back = safeReturn((await searchParams).depuis);
  return (
    <FolderActionsProvider folders={flattenTree(tree)}>
      <article className="page-stack note-page">
        {back ? <BackLink href={back} label="Retour aux résultats" /> : null}
        <Breadcrumb
          items={[
            { label: 'Dossiers', href: '/dossiers' },
            ...trail.map((node) => ({ label: node.name, href: `/dossiers/${node.id}` })),
            { label: note.title },
          ]}
        />
        <NoteView
          note={{
            id: note.id,
            title: note.title,
            content: note.content,
            tags: note.tags,
            folderId: note.folderId,
            updatedAt: note.updatedAt.toISOString(),
          }}
        />
      </article>
    </FolderActionsProvider>
  );
}
