'use client';

import { useRef, useState, useSyncExternalStore, type FormEvent, type KeyboardEvent } from 'react';
import { ENTRY_MAX_LENGTH } from '@palanotes/core/jobs';
import type { EntryView } from '@/server/entry-view';
import { apiPath } from '@/lib/paths';

const DRAFT_KEY = 'palanotes:draft:v1';
const COUNT_FROM = ENTRY_MAX_LENGTH - 2000;

const ERRORS: Record<string, string> = {
  too_long: 'Ce texte est trop long. Coupe-le en deux entrées.',
  rate_limited: 'Beaucoup d’envois d’un coup. Attends une minute et réessaie.',
  empty: 'Écris quelque chose avant de valider.',
  network: 'Envoi impossible. Ton texte est gardé ici, réessaie.',
};

function subscribeToNothing(): () => void {
  return () => undefined;
}

function readDraft(): string {
  return window.localStorage.getItem(DRAFT_KEY) ?? '';
}

export function Composer({ onSubmitted }: { onSubmitted: (entry: EntryView) => void }) {
  // The saved draft is read once the page runs in the browser; the server renders it empty.
  const savedDraft = useSyncExternalStore(subscribeToNothing, readDraft, () => '');
  const [edited, setEdited] = useState<string | null>(null);
  const text = edited ?? savedDraft;
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const input = useRef<HTMLTextAreaElement>(null);

  function update(value: string) {
    setEdited(value);
    setError(null);
    if (value) {
      window.localStorage.setItem(DRAFT_KEY, value);
    } else {
      window.localStorage.removeItem(DRAFT_KEY);
    }
  }

  async function submit() {
    if (sending) {
      return;
    }
    if (!text.trim()) {
      setError(ERRORS.empty ?? null);
      input.current?.focus();
      return;
    }
    setSending(true);
    setError(null);
    try {
      const response = await fetch(apiPath('/api/entries'), {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ content: text }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        entry?: EntryView;
        error?: string;
      };
      if (!response.ok || !data.entry) {
        setError(ERRORS[data.error ?? 'network'] ?? ERRORS.network ?? null);
        return;
      }
      update('');
      onSubmitted(data.entry);
    } catch {
      setError(ERRORS.network ?? null);
    } finally {
      setSending(false);
      input.current?.focus();
    }
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      void submit();
    }
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    void submit();
  }

  const over = text.length > ENTRY_MAX_LENGTH;

  return (
    <form
      className="sheet"
      onSubmit={onSubmit}
      action={apiPath('/api/entries')}
      method="post"
      aria-label="Nouvelle note"
    >
      <label htmlFor="entry" className="sr-only">
        Ta note
      </label>
      <textarea
        id="entry"
        name="content"
        ref={input}
        className="sheet-input"
        value={text}
        onChange={(event) => update(event.target.value)}
        onKeyDown={onKeyDown}
        placeholder={
          'Écris en vrac. Par exemple\u00a0:\nRéunion du BDE jeudi 18\u00a0h en B204, apporter les clés.\nÀ ranger avec l’asso.'
        }
        autoFocus
        spellCheck
        aria-describedby="entry-hint"
        aria-invalid={error ? true : undefined}
      />
      <div className="sheet-foot">
        <p className="sheet-hint" id="entry-hint">
          Markdown ou texte brut. Tu peux dire où la ranger{'\u00a0'}: «{'\u00a0'}avec mes cours de
          réseau{'\u00a0'}».
        </p>
        <div className="sheet-actions">
          {text.length > COUNT_FROM ? (
            <span className="sheet-count" data-over={over}>
              {text.length.toLocaleString('fr-FR')} / {ENTRY_MAX_LENGTH.toLocaleString('fr-FR')}
            </span>
          ) : null}
          <span className="max-md:hidden" aria-hidden="true">
            <kbd>Ctrl</kbd> + <kbd>Entrée</kbd>
          </span>
          <button type="submit" className="button" disabled={sending || over}>
            {sending ? 'Envoi…' : 'Valider'}
          </button>
        </div>
        {error ? (
          <p className="sheet-message" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    </form>
  );
}
