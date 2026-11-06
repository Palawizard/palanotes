'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { formatWhen } from '@/lib/format';
import { withoutLeadingTitle } from '@/lib/markdown-text';
import { mutate } from '@/lib/mutate';
import { Markdown } from './markdown';

interface NoteData {
  id: string;
  title: string;
  content: string;
  tags: string[];
  folderId: string;
  updatedAt: string;
}

type Mode = 'read' | 'edit' | 'move';

const NEW_FOLDER = 'new';

export function NoteView({
  note,
  folders,
}: {
  note: NoteData;
  folders: { id: string; path: string }[];
}) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('read');
  const [title, setTitle] = useState(note.title);
  const [content, setContent] = useState(note.content);
  const [target, setTarget] = useState(note.folderId);
  const [newPath, setNewPath] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function open(next: Mode) {
    setTitle(note.title);
    setContent(note.content);
    setTarget(note.folderId);
    setNewPath('');
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
        <p className="note-meta">
          <time dateTime={note.updatedAt}>Modifiée {formatWhen(note.updatedAt)}</time>
          {note.tags.length > 0 ? <span>{note.tags.join(', ')}</span> : null}
        </p>
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
            onClick={() => open('move')}
          >
            Déplacer
          </button>
        </div>
      </header>
      {mode === 'move' ? (
        <form
          className="move-form"
          aria-label="Déplacer la note"
          onSubmit={(event) =>
            submit(event, target === NEW_FOLDER ? { folderPath: newPath } : { folderId: target })
          }
        >
          <label className="field-label" htmlFor="move-target">
            Dossier
          </label>
          <select
            id="move-target"
            className="field"
            value={target}
            autoFocus
            onChange={(event) => setTarget(event.target.value)}
          >
            {folders.map((folder) => (
              <option key={folder.id} value={folder.id}>
                {folder.path}
              </option>
            ))}
            <option value={NEW_FOLDER}>Nouveau dossier…</option>
          </select>
          {target === NEW_FOLDER ? (
            <>
              <label className="field-label" htmlFor="move-path">
                Chemin du nouveau dossier
              </label>
              <input
                id="move-path"
                className="field"
                placeholder="Cours / Réseau"
                value={newPath}
                required
                onChange={(event) => setNewPath(event.target.value)}
              />
            </>
          ) : null}
          {error ? (
            <p className="form-error" role="alert">
              {error}
            </p>
          ) : null}
          <div className="form-actions">
            <button type="submit" className="button" disabled={saving || target === note.folderId}>
              Déplacer ici
            </button>
            <button type="button" className="button button-quiet" onClick={() => setMode('read')}>
              Annuler
            </button>
          </div>
        </form>
      ) : null}
      <div className="note-body">
        <Markdown>{withoutLeadingTitle(note.content, note.title)}</Markdown>
      </div>
    </>
  );
}
