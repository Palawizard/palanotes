'use client';

import { useParams, useRouter } from 'next/navigation';
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from 'react';
import { send } from '@/lib/mutate';
import { restoredHref, restoredText, type RestoredItem } from '@/lib/restored';
import type { FolderItem } from '@/server/folders';
import { Dialog } from './dialog';
import { CREATE, FolderPicker, ROOT } from './folder-picker';
import { MenuPopup, type MenuItem, type MenuPosition } from './menu';
import { held, notes } from '@/lib/counts';
import { StatusLine } from './status-line';
import { useUndoShortcut } from './undo-shortcut';

export interface NoteRef {
  id: string;
  title: string;
  folderId: string;
}

type Task =
  | { kind: 'create'; parentId: string | null }
  | { kind: 'rename' | 'move' | 'merge' | 'delete'; folder: FolderItem }
  | { kind: 'move-note'; note: NoteRef };

interface FolderActions {
  folders: FolderItem[];
  byId: Map<string, FolderItem>;
  subtree: (id: string) => Set<string>;
  openMenu: (folderId: string, position: MenuPosition, returnFocus: HTMLElement | null) => void;
  startCreate: (parentId: string | null) => void;
  startMoveNote: (note: NoteRef) => void;
  moveNote: (note: NoteRef, folderId: string) => Promise<void>;
  moveFolder: (folderId: string, parentId: string | null) => Promise<void>;
  deleteNote: (note: NoteRef) => Promise<void>;
  say: (message: string) => void;
}

const Context = createContext<FolderActions | null>(null);

export function useFolderActions(): FolderActions {
  const value = useContext(Context);
  if (!value) throw new Error('useFolderActions needs a FolderActionsProvider');
  return value;
}

const TITLES: Record<Task['kind'], string> = {
  create: 'Nouveau dossier',
  rename: 'Renommer le dossier',
  move: 'Déplacer le dossier',
  merge: 'Fusionner le dossier',
  delete: 'Supprimer le dossier',
  'move-note': 'Déplacer la note',
};

interface Trashed {
  id: string;
  name: string;
}

// Everything that changes the shape of the folders: menus, dialogs, drops. Every change ends
// with a refresh of the page and a short message read by screen readers.
export function FolderActionsProvider({
  folders,
  children,
}: {
  folders: FolderItem[];
  children: ReactNode;
}) {
  const router = useRouter();
  const params = useParams<{ id?: string }>();
  const [task, setTask] = useState<Task | null>(null);
  const [menu, setMenu] = useState<{
    folderId: string;
    position: MenuPosition;
    returnFocus: HTMLElement | null;
  } | null>(null);
  const [name, setName] = useState('');
  const [target, setTarget] = useState<{ id: string; path: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<{ text: string; undo?: boolean }>({ text: '' });
  // The last folder sent to the trash from this page: « Annuler » and Ctrl+Z bring it back.
  const [trashed, setTrashed] = useState<Trashed | null>(null);
  const statusTimer = useRef<number | undefined>(undefined);
  // The folder whose tree item gets the focus back once the tree shows the change.
  const refocus = useRef<string | null>(null);
  const menuTarget = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const id = refocus.current;
    if (!id) return;
    const item = document.querySelector<HTMLElement>(`[role="treeitem"][data-folder="${id}"]`);
    if (item) {
      refocus.current = null;
      item.focus();
    }
  }, [folders]);

  const byId = useMemo(() => new Map(folders.map((folder) => [folder.id, folder])), [folders]);
  const childrenOf = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const folder of folders) {
      if (folder.parentId)
        map.set(folder.parentId, [...(map.get(folder.parentId) ?? []), folder.id]);
    }
    return map;
  }, [folders]);

  const subtree = (id: string): Set<string> => {
    const ids = new Set<string>();
    const stack = [id];
    while (stack.length > 0) {
      const next = stack.pop() as string;
      if (ids.has(next)) continue;
      ids.add(next);
      stack.push(...(childrenOf.get(next) ?? []));
    }
    return ids;
  };

  function say(text: string, undo = false) {
    window.clearTimeout(statusTimer.current);
    setStatus({ text, undo });
    statusTimer.current = window.setTimeout(() => setStatus({ text: '' }), undo ? 10000 : 6000);
  }

  async function restoreTrashed() {
    if (!trashed) return;
    setTrashed(null);
    const result = await send<{ restored: RestoredItem }>(
      `/api/trash/${trashed.id}/restore`,
      'POST',
      undefined,
      'Restauration impossible. Réessaie depuis la corbeille.',
    );
    if (!result.ok) {
      say(result.message);
      return;
    }
    const { restored } = result.data;
    say(restoredText(restored, trashed.name));
    if (restored.kind === 'folder') refocus.current = restored.folderId;
    router.push(restoredHref(restored));
    router.refresh();
  }

  // Straight to the trash, without a confirmation: « Annuler », Ctrl+Z and the trash bring
  // the note back. The list stays open on the folder the note was in.
  async function deleteNote(note: NoteRef) {
    const result = await send<{ trash: { id: string; name: string } }>(
      `/api/notes/${note.id}`,
      'DELETE',
      undefined,
      'Suppression impossible. Réessaie.',
    );
    if (!result.ok) {
      say(result.message);
      return;
    }
    const { trash } = result.data;
    setTrashed({ id: trash.id, name: trash.name });
    say(`« ${trash.name} » mise à la corbeille.`, true);
    const here = new URL(window.location.href);
    here.searchParams.delete('note');
    const base = process.env.NEXT_PUBLIC_BASE_PATH ?? '';
    const path = here.pathname.startsWith(base) ? here.pathname.slice(base.length) : here.pathname;
    router.push(`${path || '/'}${here.search}`);
    router.refresh();
  }

  useUndoShortcut(trashed ? () => void restoreTrashed() : null);

  function open(next: Task) {
    setTask(next);
    setError(null);
    setBusy(false);
    setTarget(null);
    setName(next.kind === 'rename' ? next.folder.name : '');
  }

  // Back to where the action started. After a change the tree item is rendered again once
  // the page refreshes, so the focus waits for the new folders; after a cancel it goes back now.
  function close(changed = false) {
    const back = menuTarget.current;
    menuTarget.current = null;
    setTask(null);
    const id = back?.getAttribute('data-folder');
    if (changed && id) {
      refocus.current = id;
      return;
    }
    requestAnimationFrame(() => {
      const item = id
        ? document.querySelector<HTMLElement>(`[role="treeitem"][data-folder="${id}"]`)
        : null;
      if (item) item.focus();
      else if (back?.isConnected) back.focus();
    });
  }

  function where(parentId: string | null): string {
    return parentId ? (byId.get(parentId)?.path ?? 'ce dossier') : 'tout en haut';
  }

  async function moveNote(note: NoteRef, folderId: string) {
    if (folderId === note.folderId) return;
    const result = await send(
      `/api/notes/${note.id}`,
      'PATCH',
      { folderId },
      'Déplacement impossible. Réessaie.',
    );
    if (!result.ok) {
      say(result.message);
      return;
    }
    say(`« ${note.title} » déplacée dans ${where(folderId)}.`);
    router.refresh();
  }

  async function moveFolderTo(folderId: string, parentId: string | null) {
    const folder = byId.get(folderId);
    if (!folder || folder.parentId === parentId) return;
    const result = await send(
      `/api/folders/${folderId}`,
      'PATCH',
      { parentId },
      'Déplacement impossible. Réessaie.',
    );
    if (!result.ok) {
      say(result.message);
      return;
    }
    say(`Dossier « ${folder.name} » déplacé dans ${where(parentId)}.`);
    router.refresh();
  }

  async function submit(event?: FormEvent) {
    event?.preventDefault();
    if (!task || busy) return;
    setBusy(true);
    setError(null);
    let failure: string | null = null;

    if (task.kind === 'create') {
      const result = await send<{ folder: { id: string } }>(
        '/api/folders',
        'POST',
        { name, parentId: task.parentId },
        'Création impossible. Réessaie.',
      );
      if (result.ok) {
        say(`Dossier « ${name.trim()} » créé dans ${where(task.parentId)}.`);
        router.push(`/dossiers/${result.data.folder.id}`);
      } else failure = result.message;
    } else if (task.kind === 'rename') {
      const result = await send(
        `/api/folders/${task.folder.id}`,
        'PATCH',
        { name },
        'Renommage impossible. Réessaie.',
      );
      if (result.ok) say(`Dossier renommé en « ${name.trim()} ».`);
      else failure = result.message;
    } else if (task.kind === 'move') {
      if (!target) failure = 'Choisis où mettre le dossier.';
      else {
        const parentId = target.id === ROOT ? null : target.id;
        const result = await send(
          `/api/folders/${task.folder.id}`,
          'PATCH',
          { parentId },
          'Déplacement impossible. Réessaie.',
        );
        if (result.ok) say(`Dossier « ${task.folder.name} » déplacé dans ${where(parentId)}.`);
        else failure = result.message;
      }
    } else if (task.kind === 'merge') {
      if (!target) failure = 'Choisis le dossier qui reçoit le contenu.';
      else {
        const result = await send<{ movedNotes: number }>(
          `/api/folders/${task.folder.id}/merge`,
          'POST',
          { targetId: target.id },
          'Fusion impossible. Réessaie.',
        );
        if (result.ok) {
          say(
            `« ${task.folder.name} » fusionné dans ${target.path} : ${notes(result.data.movedNotes)} déplacée${result.data.movedNotes > 1 ? 's' : ''}.`,
          );
          if (subtree(task.folder.id).has(params.id ?? '')) router.push(`/dossiers/${target.id}`);
        } else failure = result.message;
      }
    } else if (task.kind === 'delete') {
      const result = await send<{
        trash: { id: string; name: string; noteCount: number; folderCount: number };
      }>(
        `/api/folders/${task.folder.id}`,
        'DELETE',
        undefined,
        'Suppression impossible. Réessaie.',
      );
      if (result.ok) {
        const { trash } = result.data;
        setTrashed({ id: trash.id, name: trash.name });
        say(
          trash.noteCount + trash.folderCount > 0
            ? `« ${trash.name} » mis à la corbeille avec ${held(trash.noteCount, trash.folderCount)}.`
            : `« ${trash.name} » mis à la corbeille.`,
          true,
        );
        if (params.id && subtree(task.folder.id).has(params.id)) {
          router.push(task.folder.parentId ? `/dossiers/${task.folder.parentId}` : '/dossiers');
        }
        setBusy(false);
        menuTarget.current = null;
        setTask(null);
        refocus.current = task.folder.parentId;
        if (!task.folder.parentId) {
          requestAnimationFrame(() => document.querySelector<HTMLElement>('.tree-pinned')?.focus());
        }
        router.refresh();
        return;
      } else failure = result.message;
    } else if (task.kind === 'move-note') {
      if (!target) failure = 'Choisis le dossier de la note.';
      else {
        const body = target.id === CREATE ? { folderPath: target.path } : { folderId: target.id };
        const result = await send(
          `/api/notes/${task.note.id}`,
          'PATCH',
          body,
          'Déplacement impossible. Réessaie.',
        );
        if (result.ok) say(`« ${task.note.title} » déplacée dans ${target.path}.`);
        else failure = result.message;
      }
    }

    setBusy(false);
    if (failure) {
      setError(failure);
      return;
    }
    close(true);
    router.refresh();
  }

  const menuFolder = menu ? byId.get(menu.folderId) : undefined;
  const menuItems: MenuItem[] = menuFolder
    ? [
        {
          id: 'create',
          label: 'Nouveau sous-dossier…',
          icon: 'plus',
          onSelect: () => open({ kind: 'create', parentId: menuFolder.id }),
        },
        {
          id: 'rename',
          label: 'Renommer…',
          icon: 'pencil',
          onSelect: () => open({ kind: 'rename', folder: menuFolder }),
        },
        {
          id: 'move',
          label: 'Déplacer vers…',
          icon: 'move',
          onSelect: () => open({ kind: 'move', folder: menuFolder }),
        },
        {
          id: 'merge',
          label: 'Fusionner dans…',
          icon: 'merge',
          onSelect: () => open({ kind: 'merge', folder: menuFolder }),
        },
        {
          id: 'delete',
          label: 'Supprimer…',
          icon: 'trash',
          danger: true,
          onSelect: () => open({ kind: 'delete', folder: menuFolder }),
        },
      ]
    : [];

  const value: FolderActions = {
    folders,
    byId,
    subtree,
    openMenu: (folderId, position, returnFocus) => {
      menuTarget.current = returnFocus;
      setMenu({ folderId, position, returnFocus });
    },
    startCreate: (parentId) => open({ kind: 'create', parentId }),
    startMoveNote: (note) => open({ kind: 'move-note', note }),
    moveNote,
    moveFolder: moveFolderTo,
    deleteNote,
    say,
  };

  const pickerFolders = folders.map((folder) => ({ id: folder.id, path: folder.path }));
  const folder = task && 'folder' in task ? task.folder : null;
  const blocked = folder ? subtree(folder.id) : new Set<string>();

  return (
    <Context.Provider value={value}>
      {children}
      {menu && menuFolder ? (
        <MenuPopup
          label={`Actions sur ${menuFolder.name}`}
          items={menuItems}
          position={menu.position}
          returnFocus={menu.returnFocus}
          onClose={() => setMenu(null)}
        />
      ) : null}
      <Dialog
        open={task !== null}
        onClose={() => close()}
        title={task ? TITLES[task.kind] : ''}
        wide={task?.kind === 'move' || task?.kind === 'merge' || task?.kind === 'move-note'}
        description={
          task?.kind === 'create'
            ? `Dans ${where(task.parentId)}.`
            : task?.kind === 'merge'
              ? `Les ${notes(task.folder.totalCount)} de « ${task.folder.name} » et ses sous-dossiers iront dans le dossier choisi. « ${task.folder.name} » disparaîtra ensuite. Aucune note n’est supprimée.`
              : task?.kind === 'delete'
                ? task.folder.totalCount + subtree(task.folder.id).size - 1 > 0
                  ? `« ${task.folder.name} » et tout ce qu’il contient iront dans la corbeille : ${held(task.folder.totalCount, subtree(task.folder.id).size - 1)}. Tu pourras tout restaurer pendant 30 jours.`
                  : `« ${task.folder.name} » est vide. Il ira dans la corbeille pendant 30 jours.`
                : task?.kind === 'move-note'
                  ? `« ${task.note.title} » est dans ${where(task.note.folderId)}.`
                  : task?.kind === 'move'
                    ? `« ${task.folder.name} » est dans ${where(task.folder.parentId)}. Ses notes et sous-dossiers le suivent.`
                    : undefined
        }
      >
        <form className="dialog-form" onSubmit={submit} noValidate>
          {task?.kind === 'create' || task?.kind === 'rename' ? (
            <>
              <label className="field-label" htmlFor="folder-name">
                Nom du dossier
              </label>
              <input
                id="folder-name"
                className="field"
                value={name}
                maxLength={80}
                autoFocus
                autoComplete="off"
                placeholder="Par exemple : Réseau"
                onChange={(event) => setName(event.target.value)}
              />
            </>
          ) : null}
          {task?.kind === 'move' || task?.kind === 'merge' ? (
            <FolderPicker
              label={task.kind === 'move' ? 'Nouvel emplacement' : 'Dossier qui reçoit le contenu'}
              folders={pickerFolders}
              value={target?.id ?? null}
              onChange={(id, path) => setTarget({ id, path })}
              onSubmit={() => void submit()}
              rootLabel={task.kind === 'move' ? 'Tout en haut' : undefined}
              disabled={(id) => {
                if (id === ROOT) return task.folder.parentId === null ? 'déjà ici' : null;
                if (id === task.folder.id) return 'ce dossier';
                if (blocked.has(id)) return 'sous-dossier';
                if (task.kind === 'move' && id === task.folder.parentId) return 'déjà ici';
                return null;
              }}
            />
          ) : null}
          {task?.kind === 'move-note' ? (
            <FolderPicker
              label="Dossier de destination"
              folders={pickerFolders}
              value={target?.id ?? null}
              onChange={(id, path) => setTarget({ id, path })}
              onSubmit={() => void submit()}
              allowCreate
              disabled={(id) => (id === task.note.folderId ? 'déjà ici' : null)}
            />
          ) : null}
          {error ? (
            <p className="form-error" role="alert">
              {error}
            </p>
          ) : null}
          <div className="dialog-actions">
            <button type="button" className="button button-quiet" onClick={() => close()}>
              Annuler
            </button>
            <button
              type="submit"
              className={task?.kind === 'delete' ? 'button button-danger' : 'button'}
              disabled={busy}
            >
              {task?.kind === 'create'
                ? 'Créer'
                : task?.kind === 'rename'
                  ? 'Renommer'
                  : task?.kind === 'merge'
                    ? 'Fusionner'
                    : task?.kind === 'delete'
                      ? 'Supprimer'
                      : 'Déplacer ici'}
            </button>
          </div>
        </form>
      </Dialog>
      <StatusLine
        text={status.text}
        onUndo={status.undo && trashed ? () => void restoreTrashed() : null}
      />
    </Context.Provider>
  );
}
