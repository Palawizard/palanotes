'use client';

import Link from 'next/link';
import { useState } from 'react';
import type { EntryView } from '@/server/entry-view';
import { formatWhen } from '@/lib/format';
import { Markdown } from './markdown';
import { STATUS_LABELS, StatusMark } from './status-mark';

export type EntryAction = 'accept' | 'reject' | 'retry' | 'undo';

interface PocketProps {
  entries: EntryView[];
  newId: string | null;
  filingId: string | null;
  busyId: string | null;
  messages: Record<string, string>;
  onAction: (entryId: string, action: EntryAction) => void;
}

const EXPANDABLE = new Set(['proposed', 'applied', 'failed', 'rejected']);

export function Pocket({ entries, newId, filingId, busyId, messages, onAction }: PocketProps) {
  const [open, setOpen] = useState<string | null>(null);
  const [autoOpened, setAutoOpened] = useState<string | null>(null);

  // The entry just written opens on its own once its filing is ready to look at.
  const fresh = entries.find((entry) => entry.id === newId);
  if (fresh && EXPANDABLE.has(fresh.status) && autoOpened !== fresh.id) {
    setAutoOpened(fresh.id);
    setOpen(fresh.id);
  }

  return (
    <section className="pocket" aria-labelledby="pocket-title">
      <div className="pocket-head">
        <h2 className="pocket-title" id="pocket-title">
          Pochette
        </h2>
        {entries.length > 0 ? (
          <span className="pocket-count">
            {entries.length} {entries.length > 1 ? 'entrées récentes' : 'entrée récente'}
          </span>
        ) : null}
      </div>
      {entries.length === 0 ? (
        <p className="pocket-empty">
          Rien pour l’instant. Ce que tu valides arrive ici, puis part dans son dossier.
        </p>
      ) : (
        <ol className="pocket-list">
          {entries.map((entry) => {
            const expandable = EXPANDABLE.has(entry.status);
            const isOpen = expandable && open === entry.id;
            const summary = (
              <>
                <span className="pocket-text">{entry.preview}</span>
                <time className="pocket-when" dateTime={entry.createdAt}>
                  {formatWhen(entry.createdAt)}
                </time>
                <span className="pocket-status" data-status={entry.status}>
                  <StatusMark status={entry.status} />
                  {STATUS_LABELS[entry.status]}
                </span>
              </>
            );
            return (
              <li
                key={entry.id}
                className="pocket-row"
                data-open={isOpen}
                data-filing={entry.id === filingId}
              >
                {expandable ? (
                  <button
                    type="button"
                    className="pocket-summary"
                    aria-expanded={isOpen}
                    aria-controls={`entry-${entry.id}`}
                    onClick={() => setOpen(isOpen ? null : entry.id)}
                  >
                    {summary}
                  </button>
                ) : (
                  <div className="pocket-summary">{summary}</div>
                )}
                {isOpen ? (
                  <EntryDetails
                    entry={entry}
                    busy={busyId === entry.id}
                    message={messages[entry.id]}
                    onAction={onAction}
                  />
                ) : null}
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}

function EntryDetails({
  entry,
  busy,
  message,
  onAction,
}: {
  entry: EntryView;
  busy: boolean;
  message: string | undefined;
  onAction: (entryId: string, action: EntryAction) => void;
}) {
  const run = entry.run;
  const button = (action: EntryAction, label: string, primary = false) => (
    <button
      type="button"
      className={primary ? 'button' : 'button button-quiet'}
      disabled={busy}
      onClick={() => onAction(entry.id, action)}
    >
      {label}
    </button>
  );

  return (
    <div className="pocket-details" id={`entry-${entry.id}`}>
      {entry.status === 'failed' ? <p className="pocket-error">{entry.error}</p> : null}
      {entry.status === 'rejected' ? (
        <p className="pocket-note">Proposition refusée. Ton texte est gardé tel quel.</p>
      ) : null}
      {run && (entry.status === 'proposed' || entry.status === 'applied') ? (
        <>
          <p className="pocket-explanation">
            {run.status === 'undone' ? 'Rangement annulé. ' : ''}
            {run.explanation}
          </p>
          {run.actions.map((action, index) => (
            <article className="plan-card" key={index}>
              <p className="plan-where">
                {action.type === 'create'
                  ? `Nouvelle note dans ${action.folderPath}`
                  : `Ajout à « ${action.noteTitle} »${action.folderPath ? `, dans ${action.folderPath}` : ''}`}
              </p>
              <h3 className="plan-title">
                {action.type === 'create' ? action.title : action.sectionTitle}
              </h3>
              <div className="plan-preview">
                <Markdown>{action.content}</Markdown>
              </div>
            </article>
          ))}
        </>
      ) : null}
      {entry.status === 'applied' && run && run.noteIds.length > 0 ? (
        <p className="plan-links">
          {run.noteIds.map((noteId, index) => (
            <Link key={noteId} href={`/note/${noteId}`}>
              {run.noteIds.length > 1 ? `Ouvrir la note ${index + 1}` : 'Ouvrir la note'}
            </Link>
          ))}
        </p>
      ) : null}
      <details className="pocket-raw">
        <summary>
          <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true" focusable="false">
            <path d="M3 1.5 7 5l-4 3.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
          </svg>
          Texte d’origine
        </summary>
        <pre>{entry.content}</pre>
      </details>
      {message ? (
        <p className="pocket-error" role="alert">
          {message}
        </p>
      ) : null}
      <div className="pocket-actions">
        {entry.status === 'proposed' ? (
          <>
            {button('accept', 'Accepter', true)}
            {button('reject', 'Refuser')}
            {button('retry', 'Relancer')}
          </>
        ) : null}
        {entry.status === 'applied' ? button('undo', 'Annuler le rangement') : null}
        {entry.status === 'failed' || entry.status === 'rejected'
          ? button('retry', 'Relancer', true)
          : null}
      </div>
    </div>
  );
}
