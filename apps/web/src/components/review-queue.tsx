'use client';

import { useEffect, useRef } from 'react';
import type { EntryView } from '@/server/entry-view';
import { formatWhen } from '@/lib/format';
import { Icon } from './icons';
import { EntryCube, PlanCard, type EntryAction } from './pocket';

// The proposals to check, one at a time on the whole screen, the actions under the thumb.
// Each answer brings the next one; the sheet closes once none is left.
export function ReviewQueue({
  open,
  entries,
  busyId,
  messages,
  onAction,
  onClose,
}: {
  open: boolean;
  entries: EntryView[];
  busyId: string | null;
  messages: Record<string, string>;
  onAction: (entryId: string, action: EntryAction) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const queue = entries.filter((entry) => entry.status === 'proposed');
  const entry = queue[0];
  const active = open && entry !== undefined;

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (active && !dialog.open) {
      dialog.showModal();
    } else if (!active && dialog.open) {
      dialog.close();
    }
  }, [active]);

  useEffect(() => {
    if (open && !entry) onClose();
  }, [open, entry, onClose]);

  const busy = entry !== undefined && busyId === entry.id;
  const message = entry ? messages[entry.id] : undefined;

  return (
    <dialog ref={ref} className="review" aria-labelledby="review-title" onClose={onClose}>
      {active && entry ? (
        <>
          <header className="review-head">
            <h2 className="review-title" id="review-title">
              {queue.length > 1 ? `${queue.length} propositions à valider` : 'Dernière proposition'}
            </h2>
            <button type="button" className="icon-button" onClick={onClose} aria-label="Fermer">
              <Icon name="close" />
            </button>
          </header>
          <article className="review-card" key={entry.id}>
            <p className="review-from">
              <EntryCube entry={entry} />
              <span className="review-text">{entry.preview}</span>
              <time dateTime={entry.createdAt}>{formatWhen(entry.createdAt)}</time>
            </p>
            {entry.run?.actions.map((action, index) => (
              <PlanCard key={index} action={action} />
            ))}
            {entry.run?.explanation ? (
              <p className="review-explanation">{entry.run.explanation}</p>
            ) : null}
            {message ? (
              <p className="pocket-error" role="alert">
                {message}
              </p>
            ) : null}
          </article>
          <footer className="review-actions">
            <button
              type="button"
              className="button button-quiet"
              disabled={busy}
              onClick={() => onAction(entry.id, 'retry')}
            >
              Relancer
            </button>
            <button
              type="button"
              className="button button-quiet"
              disabled={busy}
              onClick={() => onAction(entry.id, 'reject')}
            >
              Refuser
            </button>
            <button
              type="button"
              className="button review-accept"
              disabled={busy}
              onClick={() => onAction(entry.id, 'accept')}
            >
              <Icon name="check" />
              Accepter
            </button>
          </footer>
        </>
      ) : null}
    </dialog>
  );
}
