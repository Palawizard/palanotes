import Link from 'next/link';
import type { Note } from '@palanotes/db';
import { formatWhen } from '@/lib/format';

export function NoteList({
  notes,
  folderPaths,
}: {
  notes: Note[];
  folderPaths?: Map<string, string>;
}) {
  return (
    <ul className="note-list">
      {notes.map((note) => (
        <li key={note.id} className="note-item">
          <Link href={`/note/${note.id}`} className="note-link">
            {note.title}
          </Link>
          <p className="note-summary">{note.summary}</p>
          <p className="note-meta">
            {folderPaths?.get(note.folderId) ? <span>{folderPaths.get(note.folderId)}</span> : null}
            <time dateTime={note.updatedAt.toISOString()}>
              {formatWhen(note.updatedAt.toISOString())}
            </time>
            {note.tags.length > 0 ? <span>{note.tags.join(', ')}</span> : null}
          </p>
        </li>
      ))}
    </ul>
  );
}
