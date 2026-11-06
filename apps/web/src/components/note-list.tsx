import type { Note } from '@palanotes/db';
import { NoteRow } from './note-row';

export function NoteList({
  notes,
  folderPaths,
  label,
}: {
  notes: Note[];
  folderPaths?: Map<string, string>;
  label?: string;
}) {
  const now = new Date();
  return (
    <ul className="note-rows" aria-label={label}>
      {notes.map((note) => (
        <li key={note.id}>
          <NoteRow
            href={`/note/${note.id}`}
            now={now}
            note={{
              id: note.id,
              title: note.title,
              excerpt: note.summary,
              tags: note.tags,
              date: note.updatedAt.toISOString(),
              folderPath: folderPaths?.get(note.folderId),
            }}
          />
        </li>
      ))}
    </ul>
  );
}
