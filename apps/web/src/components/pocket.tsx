'use client';

import Link from 'next/link';
import { useState } from 'react';
import type { EntryStatus } from '@palanotes/db';
import type { ActionView, EntryView } from '@/server/entry-view';
import { formatWhen } from '@/lib/format';
import { Icon } from './icons';
import { Markdown } from './markdown';
import { STATUS_LABELS, StatusMark } from './status-mark';

export type EntryAction = 'accept' | 'reject' | 'retry' | 'undo';

interface PocketProps {
  entries: EntryView[];
  newId: string | null;
  filingId: string | null;
  settledId: string | null;
  busyId: string | null;
  messages: Record<string, string>;
  onAction: (entryId: string, action: EntryAction) => void;
}

const EXPANDABLE = new Set<EntryStatus>(['proposed', 'applied', 'failed', 'rejected']);
const TO_DO = new Set<EntryStatus>(['pending', 'processing', 'proposed', 'failed']);
const SUMMARY: { status: EntryStatus; one: string; many: string }[] = [
  { status: 'proposed', one: 'à valider', many: 'à valider' },
  { status: 'failed', one: 'échec', many: 'échecs' },
  { status: 'processing', one: 'en cours', many: 'en cours' },
  { status: 'pending', one: 'en attente', many: 'en attente' },
];

// Where the filing sends the entry, for the row: the folder, or the note it extends.
function destination(entry: EntryView): string | null {
  const action = entry.run?.actions[0];
  if (!action || entry.status === 'rejected' || entry.run?.status === 'undone') return null;
  const where = action.type === 'create' ? action.folderPath : `« ${action.noteTitle} »`;
  return entry.run && entry.run.actions.length > 1
    ? `${where} et ${entry.run.actions.length - 1} autre${entry.run.actions.length > 2 ? 's' : ''}`
    : where;
}

export function Pocket({
  entries,
  newId,
  filingId,
  settledId,
  busyId,
  messages,
  onAction,
}: PocketProps) {
  const [open, setOpen] = useState<string | null>(null);
  const [autoOpened, setAutoOpened] = useState<string | null>(null);

  // The entry just written opens on its own once its filing is ready to look at.
  const fresh = entries.find((entry) => entry.id === newId);
  if (fresh && EXPANDABLE.has(fresh.status) && autoOpened !== fresh.id) {
    setAutoOpened(fresh.id);
    setOpen(fresh.id);
  }

  const toDo = entries.filter((entry) => TO_DO.has(entry.status));
  const done = entries.filter((entry) => !TO_DO.has(entry.status));
  const counts = SUMMARY.map((item) => ({
    ...item,
    count: entries.filter((entry) => entry.status === item.status).length,
  })).filter((item) => item.count > 0);

  const row = (entry: EntryView) => {
    const expandable = EXPANDABLE.has(entry.status);
    const isOpen = expandable && open === entry.id;
    const where = destination(entry);
    const summary = (
      <>
        <span className="pocket-text">{entry.preview}</span>
        <span className="pocket-when">
          <time dateTime={entry.createdAt}>{formatWhen(entry.createdAt)}</time>
          {where ? (
            <span className="pocket-where">
              <Icon name={entry.status === 'applied' ? 'folder' : 'move'} size={14} />
              {entry.status === 'applied' ? where : `vers ${where}`}
            </span>
          ) : null}
        </span>
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
        data-settled={entry.id === settledId}
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
  };

  return (
    <section className="pocket" aria-labelledby="pocket-title">
      <div className="pocket-head">
        <h2 className="pocket-title" id="pocket-title">
          Pochette
        </h2>
        {entries.length > 0 ? (
          <p className="pocket-summary-line">
            {counts.length === 0 ? (
              <span className="pocket-tally" data-status="applied">
                <StatusMark status="applied" />
                Tout est rangé
              </span>
            ) : (
              counts.map((item) => (
                <span key={item.status} className="pocket-tally" data-status={item.status}>
                  <StatusMark status={item.status} />
                  {item.count} {item.count > 1 ? item.many : item.one}
                </span>
              ))
            )}
          </p>
        ) : null}
      </div>
      {entries.length === 0 ? (
        <p className="pocket-empty">
          Rien pour l’instant. Ce que tu valides arrive ici, puis part dans son dossier.
        </p>
      ) : (
        <>
          {toDo.length > 0 ? (
            <>
              <h3 className="pocket-group">À traiter</h3>
              <ol className="pocket-list">{toDo.map(row)}</ol>
            </>
          ) : null}
          {done.length > 0 ? (
            <>
              <h3 className="pocket-group">Récemment rangées</h3>
              <ol className="pocket-list">{done.map(row)}</ol>
            </>
          ) : null}
        </>
      )}
    </section>
  );
}

function PlanCard({ action }: { action: ActionView }) {
  return (
    <article className="plan-card">
      <p className="plan-where">
        <span className="plan-where-label">
          {action.type === 'create' ? 'Nouvelle note dans' : 'Ajout à la note'}
        </span>
        <span className="plan-where-path">
          <Icon name={action.type === 'create' ? 'folder' : 'note'} size={14} />
          {action.type === 'create'
            ? action.folderPath
            : `« ${action.noteTitle} »${action.folderPath ? `, dans ${action.folderPath}` : ''}`}
        </span>
      </p>
      <h4 className="plan-title">
        {action.type === 'create' ? action.title : `Nouvelle section : ${action.sectionTitle}`}
      </h4>
      <div className="plan-preview">
        <Markdown>{action.content}</Markdown>
      </div>
    </article>
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
  const button = (action: EntryAction, label: string, kind: 'primary' | 'quiet' = 'quiet') => (
    <button
      type="button"
      className={kind === 'primary' ? 'button' : 'button button-quiet'}
      disabled={busy}
      onClick={() => onAction(entry.id, action)}
    >
      {action === 'accept' ? <Icon name="check" /> : null}
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
          {run.actions.map((action, index) => (
            <PlanCard key={index} action={action} />
          ))}
          <p className="pocket-explanation">
            {run.status === 'undone' ? 'Rangement annulé. ' : ''}
            {run.explanation}
          </p>
        </>
      ) : null}
      {message ? (
        <p className="pocket-error" role="alert">
          {message}
        </p>
      ) : null}
      <div className="pocket-actions">
        {entry.status === 'proposed' ? (
          <>
            {button('accept', 'Accepter', 'primary')}
            {button('reject', 'Refuser')}
            <span className="pocket-actions-gap" />
            {button('retry', 'Relancer')}
          </>
        ) : null}
        {entry.status === 'applied' && run && run.noteIds.length > 0 ? (
          <span className="plan-links">
            {run.noteIds.map((noteId, index) => (
              <Link key={noteId} href={`/note/${noteId}`} className="button button-small">
                <Icon name="note" />
                {run.noteIds.length > 1 ? `Ouvrir la note ${index + 1}` : 'Ouvrir la note'}
              </Link>
            ))}
          </span>
        ) : null}
        {entry.status === 'applied' ? button('undo', 'Annuler le rangement') : null}
        {entry.status === 'failed' || entry.status === 'rejected'
          ? button('retry', 'Relancer', 'primary')
          : null}
      </div>
      <details className="pocket-raw">
        <summary>
          <Icon name="chevronRight" size={12} />
          Texte d’origine
        </summary>
        <pre>{entry.content}</pre>
      </details>
    </div>
  );
}
