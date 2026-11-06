'use client';

import { useEffect } from 'react';

function isEditable(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.isContentEditable ||
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement
  );
}

// Ctrl+Z (Cmd+Z on a Mac) runs `onUndo` while it is set. It stays out of the way of text
// fields, where the browser's own undo applies, and of an open dialog.
export function useUndoShortcut(onUndo: (() => void) | null): void {
  useEffect(() => {
    if (!onUndo) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key.toLowerCase() !== 'z' || event.shiftKey || event.altKey) return;
      if (!(event.ctrlKey || event.metaKey)) return;
      if (isEditable(event.target) || document.querySelector('dialog[open]')) return;
      event.preventDefault();
      onUndo?.();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onUndo]);
}
