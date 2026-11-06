import { listRecentNoteRows } from '@palanotes/db';
import { explorerHref } from '@/lib/explorer-url';
import { getDb } from '@/server/db';
import { folderChoices, loadNotePane, toRowData } from '@/server/explorer';
import { loadFolderTree } from '@/server/folders';
import { BackLink, ExplorerMain, NotePane, type ExplorerLevel } from './explorer';
import { NoteRow } from './note-row';

const RECENT_COUNT = 30;

// The recent notes of every folder, newest first. On a phone, `/dossiers` shows the folders
// and `/dossiers/recents` this list.
export async function RecentView({
  userId,
  noteParam,
  phoneLevel,
}: {
  userId: string;
  noteParam: unknown;
  phoneLevel: Exclude<ExplorerLevel, 'note'>;
}) {
  const db = getDb();
  const tree = await loadFolderTree(db, userId);
  const [rows, note] = await Promise.all([
    listRecentNoteRows(db, userId, RECENT_COUNT),
    loadNotePane(db, userId, noteParam, tree),
  ]);
  const now = new Date();
  return (
    <ExplorerMain
      level={note ? 'note' : phoneLevel}
      list={
        <>
          <div className="pane-head list-head">
            <BackLink href="/dossiers" label="Dossiers" phoneOnly />
            <h1 className="pane-heading" id="list-title">
              Récents
            </h1>
            <p className="list-meta">Les {rows.length} dernières notes modifiées</p>
          </div>
          <div className="pane-scroll">
            <ul className="note-rows" aria-label="Notes récentes">
              {rows.map((row) => (
                <li key={row.id}>
                  <NoteRow
                    href={explorerHref({ note: row.id })}
                    current={row.id === note?.id}
                    now={now}
                    scroll={false}
                    note={toRowData(row, 'updatedAt', tree.byId.get(row.folderId)?.path)}
                  />
                </li>
              ))}
            </ul>
          </div>
        </>
      }
      note={
        <NotePane
          note={note}
          folders={folderChoices(tree)}
          backHref="/dossiers/recents"
          backLabel="Récents"
        />
      }
    />
  );
}
