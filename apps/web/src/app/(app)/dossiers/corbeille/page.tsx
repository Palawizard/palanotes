import type { Metadata } from 'next';
import { listTrash } from '@palanotes/db';
import { BackLink, ExplorerMain } from '@/components/explorer';
import { Icon } from '@/components/icons';
import { TrashList, type TrashRow } from '@/components/trash-list';
import { getCurrentUser } from '@/server/auth';
import { getDb } from '@/server/db';
import { loadFolderTree } from '@/server/folders';

export const metadata: Metadata = { title: 'Corbeille' };

export default async function TrashPage() {
  const user = await getCurrentUser();
  if (!user) {
    return null;
  }
  const db = getDb();
  const [items, tree] = await Promise.all([listTrash(db, user.id), loadFolderTree(db, user.id)]);
  const rows: TrashRow[] = items.map((item) => ({
    id: item.id,
    name: item.name,
    path: item.path,
    noteCount: item.noteCount,
    folderCount: item.folderCount,
    deletedAt: item.deletedAt.toISOString(),
  }));
  const list = <TrashList items={rows} now={new Date().toISOString()} />;

  // Without any folder left, the explorer has no panes: the trash is a plain page.
  if (tree.roots.length === 0) {
    return (
      <div className="page-stack">
        <h1 className="page-title" id="list-title">
          Corbeille
        </h1>
        {list}
      </div>
    );
  }
  return (
    <ExplorerMain
      level="list"
      list={
        <>
          <div className="pane-head list-head">
            <BackLink href="/dossiers" label="Dossiers" phoneOnly />
            <h1 className="pane-heading" id="list-title">
              Corbeille
            </h1>
          </div>
          <div className="pane-scroll">{list}</div>
        </>
      }
      note={
        <div className="pane-empty">
          <Icon name="undo" size={24} />
          <p>
            Un dossier restauré retrouve sa place, avec ses notes, ses sous-dossiers et l’historique
            de chaque note.
          </p>
        </div>
      }
    />
  );
}
