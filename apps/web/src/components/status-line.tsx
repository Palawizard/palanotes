'use client';

import { Icon } from './icons';

// The short message after a change in the explorer, read by screen readers. After a
// deletion it carries « Annuler », also reachable with Ctrl+Z.
export function StatusLine({ text, onUndo }: { text: string; onUndo: (() => void) | null }) {
  return (
    <div className="explorer-status" data-shown={text ? true : undefined}>
      <p className="explorer-status-text" role="status">
        {text}
      </p>
      {text && onUndo ? (
        <button
          type="button"
          className="button button-quiet button-small explorer-status-undo"
          onClick={onUndo}
        >
          <Icon name="undo" />
          Annuler
          <span className="explorer-status-key" aria-hidden="true">
            <kbd>Ctrl</kbd>+<kbd>Z</kbd>
          </span>
        </button>
      ) : null}
    </div>
  );
}
