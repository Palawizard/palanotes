'use client';

import { useState, type DragEvent, type ReactNode } from 'react';
import { currentDrag, endDrag, startDrag } from '@/lib/drag';
import { useFolderActions } from './folder-actions';
import { Icon } from './icons';

// Notes and folders carry their identity in data-drag attributes; one listener here
// records what is being dragged for the drop targets of the tree.
export function ExplorerShell({ children }: { children: ReactNode }) {
  return (
    <div
      className="explorer"
      onDragStart={(event: DragEvent<HTMLDivElement>) => {
        const source = (event.target as HTMLElement).closest<HTMLElement>('[data-drag]');
        const kind = source?.dataset.drag;
        const id = source?.dataset.id;
        if (!source || !id || (kind !== 'note' && kind !== 'folder')) return;
        startDrag({
          kind,
          id,
          label: source.dataset.label ?? '',
          from: source.dataset.from || null,
        });
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', source.dataset.label ?? '');
        source.dataset.dragging = 'true';
      }}
      onDragEnd={(event) => {
        endDrag();
        const source = (event.target as HTMLElement).closest<HTMLElement>('[data-drag]');
        if (source) delete source.dataset.dragging;
      }}
    >
      {children}
    </div>
  );
}

// Head of the tree pane: a new top-level folder, and a drop zone to move a folder to the top.
export function TreeHead() {
  const actions = useFolderActions();
  const [over, setOver] = useState(false);
  const canDrop = () => {
    const drag = currentDrag();
    return drag?.kind === 'folder' && drag.from !== null;
  };
  return (
    <div
      className="pane-head tree-head"
      data-drop={over || undefined}
      onDragOver={(event) => {
        if (!canDrop()) return;
        event.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(event) => {
        const drag = currentDrag();
        setOver(false);
        if (!drag || !canDrop()) return;
        event.preventDefault();
        endDrag();
        void actions.moveFolder(drag.id, null);
      }}
    >
      <h2 className="pane-title" id="tree-title">
        {over ? 'Déposer tout en haut' : 'Dossiers'}
      </h2>
      <button
        type="button"
        className="icon-button"
        aria-label="Nouveau dossier"
        title="Nouveau dossier"
        onClick={() => actions.startCreate(null)}
      >
        <Icon name="plus" />
      </button>
    </div>
  );
}

// The folder's menu in the list header, the same as a right click in the tree.
export function FolderMenuButton({ folderId, name }: { folderId: string; name: string }) {
  const actions = useFolderActions();
  return (
    <button
      type="button"
      className="icon-button"
      aria-label={`Actions sur ${name}`}
      aria-haspopup="menu"
      onClick={(event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        actions.openMenu(folderId, { x: rect.left, y: rect.bottom + 4 }, event.currentTarget);
      }}
    >
      <Icon name="more" />
    </button>
  );
}
