'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { formatDay, formatFull } from '@/lib/format';
import { withoutLeadingTitle } from '@/lib/markdown-text';
import { mutate } from '@/lib/mutate';
import { useFolderActions } from './folder-actions';
import { Markdown } from './markdown';
import { TagList } from './tag-list';

interface NoteData {
  id: string;
  title: string;
  content: string;
  tags: string[];
  folderId: string;
  updatedAt: string;
}

type Mode = 'read' | 'edit';

export function NoteView({ note }: { note: NoteData }) {
  const router = useRouter();
  const actions = useFolderActions();
  const [mode, setMode] = useState<Mode>('read');
  const [title, setTitle] = useState(note.title);
  const [content, setContent] = useState(note.content);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function open(next: Mode) {
    setTitle(note.title);
    setContent(note.content);
    setError(null);
    setMode(next);
  }

  async function submit(event: FormEvent, body: unknown) {
    event.preventDefault();
    setSaving(true);
    const message = await mutate(
      `/api/notes/${note.id}`,
      'PATCH',
      body,
      'Enregistrement impossible. Réessaie.',
    );
    setSaving(false);
    if (message) {
      setError(message);
      return;
    }
    setMode('read');
    router.refresh();
  }

  if (mode === 'edit') {
    return (
      <form
        className="note-editor"
        onSubmit={(event) => submit(event, { title, content })}
        aria-label="Modifier la note"
      >
        <label className="field-label" htmlFor="note-title">
          Titre
        </label>
        <input
          id="note-title"
          className="field field-title"
          value={title}
          maxLength={200}
          required
          onChange={(event) => setTitle(event.target.value)}
        />
        <label className="field-label" htmlFor="note-content">
          Contenu (Markdown)
        </label>
        <textarea
          id="note-content"
          className="field field-content"
          value={content}
          autoFocus
          onChange={(event) => setContent(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
              event.currentTarget.form?.requestSubmit();
            }
          }}
        />
        {error ? (
          <p className="form-error" role="alert">
            {error}
          </p>
        ) : null}
        <div className="form-actions">
          <button type="submit" className="button" disabled={saving}>
            {saving ? 'Enregistrement…' : 'Enregistrer'}
          </button>
          <button type="button" className="button button-quiet" onClick={() => setMode('read')}>
            Annuler
          </button>
        </div>
      </form>
    );
  }

  return (
    <>
      <header className="note-head">
        <h1 className="page-title">{note.title}</h1>
        <div className="note-meta">
          <time dateTime={note.updatedAt} title={formatFull(note.updatedAt)}>
            Modifiée le {formatDay(note.updatedAt)}
          </time>
          <TagList tags={note.tags} />
        </div>
        <div className="form-actions">
          <button
            type="button"
            className="button button-quiet button-small"
            onClick={() => open('edit')}
          >
            Modifier
          </button>
          <button
            type="button"
            className="button button-quiet button-small"
            onClick={() =>
              actions.startMoveNote({ id: note.id, title: note.title, folderId: note.folderId })
            }
          >
            Déplacer vers…
          </button>
        </div>
      </header>
      <div className="note-body">
        <Markdown>{withoutLeadingTitle(note.content, note.title)}</Markdown>
      </div>
    </>
  );
}
