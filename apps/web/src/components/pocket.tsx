import type { EntryView } from '@/server/entry-view';
import { formatWhen } from '@/lib/format';
import { STATUS_LABELS, StatusMark } from './status-mark';

export function Pocket({ entries, newId }: { entries: EntryView[]; newId: string | null }) {
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
        <ol className="pocket-list" aria-live="polite">
          {entries.map((entry) => (
            <li key={entry.id} className="pocket-row" data-new={entry.id === newId}>
              <span className="pocket-text">{entry.preview}</span>
              <time className="pocket-when" dateTime={entry.createdAt}>
                {formatWhen(entry.createdAt)}
              </time>
              {entry.error ? <span className="pocket-error">{entry.error}</span> : null}
              <span className="pocket-status" data-status={entry.status}>
                <StatusMark status={entry.status} />
                {STATUS_LABELS[entry.status]}
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
