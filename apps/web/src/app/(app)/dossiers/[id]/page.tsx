import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { z } from 'zod';
import { parseNoteSort, sortNotes } from '@palanotes/core';
import { listNoteRowsInFolder } from '@palanotes/db';
import { Breadcrumb } from '@/components/breadcrumb';
import { BackLink, ExplorerMain, NotePane, SortLinks } from '@/components/explorer';
import { Icon } from '@/components/icons';
import { NoteRow } from '@/components/note-row';
import { RenameFolder } from '@/components/rename-folder';
import { explorerHref, PAGE_SIZE, parseShown } from '@/lib/explorer-url';
import { getCurrentUser } from '@/server/auth';
import { getDb } from '@/server/db';
import { folderChoices, loadNotePane, toRowData } from '@/server/explorer';
import { loadFolderTree } from '@/server/folders';

export const metadata: Metadata = { title: 'Dossier' };

type Search = Promise<{ note?: string | string[]; tri?: string | string[]; n?: string | string[] }>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function countText(direct: number, total: number): string {
  const here = direct === 0 ? 'Aucune note ici' : `${direct} note${direct > 1 ? 's' : ''} ici`;
  return total > direct ? `${here}, ${total} avec les sous-dossiers` : here;
}

export default async function FolderPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Search;
}) {
  const user = await getCurrentUser();
  const id = z.uuid().safeParse((await params).id);
  if (!user || !id.success) {
    notFound();
  }
  const query = await searchParams;
  const sort = parseNoteSort(first(query.tri));
  const shown = parseShown(first(query.n));
  const db = getDb();
  const tree = await loadFolderTree(db, user.id);
  const folder = tree.byId.get(id.data);
  if (!folder) {
    notFound();
  }
  const [rows, note] = await Promise.all([
    listNoteRowsInFolder(db, user.id, folder.id),
    loadNotePane(db, user.id, first(query.note), tree),
  ]);
  const sorted = sortNotes(rows, sort);
  const visible = sorted.slice(0, shown);
  const trail = tree.ancestors(folder.id).slice(0, -1);
  const parent = trail.at(-1);
  const place = { folderId: folder.id, sort, shown };
  const now = new Date();

  return (
    <ExplorerMain
      level={note ? 'note' : 'list'}
      list={
        <>
          <div className="pane-head list-head">
            <BackLink
              href={parent ? `/dossiers/${parent.id}` : '/dossiers'}
              label={parent?.name ?? 'Dossiers'}
              phoneOnly
            />
            <Breadcrumb
              items={trail.map((node) => ({ label: node.name, href: `/dossiers/${node.id}` }))}
              endsHere={false}
            />
            <RenameFolder folderId={folder.id} name={folder.name} />
            <div className="list-tools">
              <p className="list-meta">{countText(folder.noteCount, folder.totalCount)}</p>
              {rows.length > 1 ? (
                <SortLinks
                  current={sort}
                  hrefFor={(next) => explorerHref({ ...place, sort: next, note: note?.id })}
                />
              ) : null}
            </div>
          </div>
          <div className="pane-scroll">
            {folder.children.length > 0 ? (
              <ul className="folder-rows" aria-label="Sous-dossiers">
                {folder.children.map((child) => (
                  <li key={child.id}>
                    <Link href={`/dossiers/${child.id}`} className="folder-row">
                      <Icon name="folder" className="tree-icon" />
                      <span className="folder-row-name">{child.name}</span>
                      <span className="tree-count">{child.totalCount}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : null}
            {visible.length > 0 ? (
              <ul className="note-rows" aria-label={`Notes de ${folder.name}`}>
                {visible.map((row) => (
                  <li key={row.id}>
                    <NoteRow
                      href={explorerHref({ ...place, note: row.id })}
                      current={row.id === note?.id}
                      now={now}
                      scroll={false}
                      note={toRowData(row, sort === 'creee' ? 'createdAt' : 'updatedAt')}
                    />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="pane-note">
                {folder.children.length > 0
                  ? 'Les notes de ce dossier sont rangées dans ses sous-dossiers.'
                  : 'Ce dossier est vide.'}
              </p>
            )}
            {sorted.length > visible.length ? (
              <Link
                className="show-more"
                href={explorerHref({ ...place, shown: shown + PAGE_SIZE, note: note?.id })}
                scroll={false}
              >
                Afficher {Math.min(PAGE_SIZE, sorted.length - visible.length)} notes de plus
              </Link>
            ) : null}
          </div>
        </>
      }
      note={
        <NotePane
          note={note}
          folders={folderChoices(tree)}
          backHref={explorerHref(place)}
          backLabel={folder.name}
        />
      }
    />
  );
}
