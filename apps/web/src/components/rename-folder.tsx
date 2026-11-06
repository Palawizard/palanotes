'use client';

import { useRouter } from 'next/navigation';
import { useRef, useState, type FormEvent } from 'react';
import { mutate } from '@/lib/mutate';

export function RenameFolder({ folderId, name }: { folderId: string; name: string }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(name);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!value.trim()) {
      setError('Donne un nom au dossier.');
      return;
    }
    setSaving(true);
    const message = await mutate(
      `/api/folders/${folderId}`,
      'PATCH',
      { name: value },
      'Renommage impossible. Réessaie.',
    );
    setSaving(false);
    if (message) {
      setError(message);
      return;
    }
    setEditing(false);
    router.refresh();
  }

  if (!editing) {
    return (
      <div className="title-row">
        <h1 className="pane-heading" id="list-title">
          {name}
        </h1>
        <button
          ref={trigger}
          type="button"
          className="button button-quiet button-small"
          onClick={() => {
            setValue(name);
            setError(null);
            setEditing(true);
          }}
        >
          Renommer
        </button>
      </div>
    );
  }

  return (
    <form className="inline-form" onSubmit={save} aria-label="Renommer le dossier">
      <label htmlFor="folder-name" className="sr-only">
        Nom du dossier
      </label>
      <input
        id="folder-name"
        className="field"
        value={value}
        maxLength={80}
        autoFocus
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            setEditing(false);
          }
        }}
      />
      <button type="submit" className="button" disabled={saving}>
        Enregistrer
      </button>
      <button type="button" className="button button-quiet" onClick={() => setEditing(false)}>
        Annuler
      </button>
      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}
    </form>
  );
}
