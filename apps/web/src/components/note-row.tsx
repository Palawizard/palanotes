import Link from 'next/link';
import { formatFull, formatShort } from '@/lib/format';

export interface NoteRowData {
  id: string;
  title: string;
  excerpt: string;
  tags: string[];
  date: string;
  folderPath?: string;
}

// One note in a list: title and date on the first line, a one-line excerpt, then the
// folder and tags in the meta size.
export function NoteRow({
  note,
  href,
  current = false,
  now,
}: {
  note: NoteRowData;
  href: string;
  current?: boolean;
  now?: Date;
}) {
  return (
    <Link
      href={href}
      className="note-row"
      aria-current={current ? 'page' : undefined}
      prefetch={false}
    >
      <span className="note-row-head">
        <span className="note-row-title">{note.title}</span>
        <time className="note-row-date" dateTime={note.date} title={formatFull(note.date)}>
          {formatShort(note.date, now)}
        </time>
      </span>
      {note.excerpt ? <span className="note-row-excerpt">{note.excerpt}</span> : null}
      {note.folderPath || note.tags.length > 0 ? (
        <span className="note-row-meta">
          {note.folderPath ? <span className="note-row-path">{note.folderPath}</span> : null}
          {note.tags.slice(0, 3).map((tag) => (
            <span key={tag} className="tag">
              {tag}
            </span>
          ))}
        </span>
      ) : null}
    </Link>
  );
}
