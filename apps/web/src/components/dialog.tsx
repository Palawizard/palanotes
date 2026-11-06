'use client';

import { useEffect, useId, useRef, type ReactNode } from 'react';
import { Icon } from './icons';

// Modal on the native <dialog>: focus is trapped and returns to the trigger on close,
// Escape closes. Used for choices that must not be lost behind the page (moving,
// merging, confirming a deletion).
export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  wide = false,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: ReactNode;
  children: ReactNode;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  return (
    <dialog
      ref={ref}
      className="dialog"
      data-wide={wide || undefined}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      onClose={onClose}
      onClick={(event) => {
        // A click on the backdrop lands on the dialog element itself.
        if (event.target === event.currentTarget) onClose();
      }}
    >
      {open ? (
        <div className="dialog-body">
          <header className="dialog-head">
            <h2 className="dialog-title" id={titleId}>
              {title}
            </h2>
            <button type="button" className="icon-button" onClick={onClose} aria-label="Fermer">
              <Icon name="close" />
            </button>
          </header>
          {description ? (
            <div className="dialog-description" id={descriptionId}>
              {description}
            </div>
          ) : null}
          {children}
        </div>
      ) : null}
    </dialog>
  );
}
