'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { trashExpiresAt } from '@palanotes/core';
import { held } from '@/lib/counts';
import { formatDay, formatDaysLeft, formatFull } from '@/lib/format';
import { send } from '@/lib/mutate';
import { Dialog } from './dialog';
import { useFolderActions } from './folder-actions';
import { Icon } from './icons';

export interface TrashRow {
  id: string;
  name: string;
  path: string[];
  noteCount: number;
  folderCount: number;
  deletedAt: string;
}

type Confirm = { kind: 'one'; item: TrashRow } | { kind: 'all' } | null;

function where(path: string[]): string {
  return path.length > 1 ? `Était dans ${path.slice(0, -1).join(' / ')}` : 'Était tout en haut';
}

// The deleted folders, newest first: each one goes back where it was, or goes for good.
export function TrashList({ items, now }: { items: TrashRow[]; now: string }) {
  const router = useRouter();
  const { say } = useFolderActions();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<Confirm>(null);
  const [error, setError] = useState<string | null>(null);
  const today = new Date(now);

  async function restore(item: TrashRow) {
    setBusyId(item.id);
    const result = await send<{ folder: { folderId: string; name: string; renamed: boolean } }>(
      `/api/trash/${item.id}/restore`,
      'POST',
      undefined,
      'Restauration impossible. Réessaie.',
    );
    setBusyId(null);
    if (!result.ok) {
      say(result.message);
      return;
    }
    const { folderId, name, renamed } = result.data.folder;
    say(
      renamed ? `« ${item.name} » restauré sous le nom « ${name} ».` : `« ${item.name} » restauré.`,
    );
    router.push(`/dossiers/${folderId}`);
    router.refresh();
  }

  async function removeForGood() {
    if (!confirm) return;
    setError(null);
    const result =
      confirm.kind === 'one'
        ? await send(
            `/api/trash/${confirm.item.id}`,
            'DELETE',
            undefined,
            'Suppression impossible.',
          )
        : await send('/api/trash', 'DELETE', undefined, 'Impossible de vider la corbeille.');
    if (!result.ok) {
      setError(result.message);
      return;
    }
    say(
      confirm.kind === 'one'
        ? `« ${confirm.item.name} » supprimé définitivement.`
        : 'Corbeille vidée.',
    );
    setConfirm(null);
    router.refresh();
  }

  return (
    <>
      <div className="trash-head">
        <p className="list-meta">
          Un dossier supprimé reste ici 30 jours avec ses notes, puis disparaît.
        </p>
        {items.length > 0 ? (
          <button
            type="button"
            className="button button-quiet button-small"
            onClick={() => setConfirm({ kind: 'all' })}
          >
            <Icon name="trash" />
            Vider la corbeille
          </button>
        ) : null}
      </div>
      {items.length === 0 ? (
        <div className="trash-empty">
          <Icon name="trash" size={24} />
          <p>La corbeille est vide.</p>
        </div>
      ) : (
        <ul className="trash-rows" aria-label="Dossiers supprimés">
          {items.map((item) => (
            <li key={item.id} className="trash-row">
              <Icon name="folder" className="trash-row-icon" />
              <div className="trash-row-text">
                <p className="trash-row-name">{item.name}</p>
                <p className="trash-row-meta">{where(item.path)}</p>
                <p className="trash-row-meta">
                  {item.noteCount + item.folderCount > 0
                    ? held(item.noteCount, item.folderCount)
                    : 'Vide'}
                  {' · '}
                  <time dateTime={item.deletedAt} title={formatFull(item.deletedAt)}>
                    supprimé le {formatDay(item.deletedAt, today)}
                  </time>
                  {' · '}
                  {formatDaysLeft(trashExpiresAt(new Date(item.deletedAt)).toISOString(), today)}
                </p>
              </div>
              <div className="trash-row-actions">
                <button
                  type="button"
                  className="button button-quiet button-small"
                  disabled={busyId === item.id}
                  onClick={() => void restore(item)}
                >
                  <Icon name="undo" />
                  {busyId === item.id ? 'Restauration…' : 'Restaurer'}
                </button>
                <button
                  type="button"
                  className="icon-button"
                  aria-label={`Supprimer définitivement ${item.name}`}
                  title="Supprimer définitivement"
                  onClick={() => setConfirm({ kind: 'one', item })}
                >
                  <Icon name="trash" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <Dialog
        open={confirm !== null}
        onClose={() => {
          setConfirm(null);
          setError(null);
        }}
        title={confirm?.kind === 'all' ? 'Vider la corbeille' : 'Supprimer définitivement'}
        description={
          confirm?.kind === 'all'
            ? `Les ${items.length} dossiers de la corbeille et leurs notes seront supprimés pour de bon. Ce n’est pas annulable.`
            : confirm?.kind === 'one'
              ? `« ${confirm.item.name} » et ce qu’il contient seront supprimés pour de bon. Ce n’est pas annulable.`
              : undefined
        }
      >
        <form
          className="dialog-form"
          onSubmit={(event) => {
            event.preventDefault();
            void removeForGood();
          }}
        >
          {error ? (
            <p className="form-error" role="alert">
              {error}
            </p>
          ) : null}
          <div className="dialog-actions">
            <button
              type="button"
              className="button button-quiet"
              onClick={() => {
                setConfirm(null);
                setError(null);
              }}
            >
              Annuler
            </button>
            <button type="submit" className="button button-danger">
              {confirm?.kind === 'all' ? 'Vider' : 'Supprimer'}
            </button>
          </div>
        </form>
      </Dialog>
    </>
  );
}
