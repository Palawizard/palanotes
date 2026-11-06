'use client';

import { useCallback, useEffect, useState } from 'react';
import type { EntryView } from '@/server/entry-view';
import { apiPath } from '@/lib/paths';
import { Composer } from './composer';
import { Pocket, type EntryAction } from './pocket';

const POLL_MS = 2500;
const UNSETTLED = new Set(['pending', 'processing']);

function withoutKey(record: Record<string, string>, key: string): Record<string, string> {
  const next = { ...record };
  delete next[key];
  return next;
}

export function Desk({ initialEntries }: { initialEntries: EntryView[] }) {
  const [entries, setEntries] = useState(initialEntries);
  const [newId, setNewId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Record<string, string>>({});
  const unsettled = entries.some((entry) => UNSETTLED.has(entry.status));

  const refresh = useCallback(async () => {
    const response = await fetch(apiPath('/api/entries'), { cache: 'no-store' });
    if (response.ok) {
      const data = (await response.json()) as { entries: EntryView[] };
      setEntries(data.entries);
    }
  }, []);

  useEffect(() => {
    if (!unsettled) {
      return;
    }
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') {
        refresh().catch(() => undefined);
      }
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [unsettled, refresh]);

  const onSubmitted = useCallback((entry: EntryView) => {
    setNewId(entry.id);
    setEntries((current) => [entry, ...current.filter((item) => item.id !== entry.id)]);
  }, []);

  const onAction = useCallback(async (entryId: string, action: EntryAction) => {
    setBusyId(entryId);
    setMessages((current) => withoutKey(current, entryId));
    try {
      const response = await fetch(apiPath(`/api/entries/${entryId}`), {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        entries?: EntryView[];
        message?: string;
      };
      if (response.ok && data.entries) {
        setEntries(data.entries);
      } else {
        setMessages((current) => ({
          ...current,
          [entryId]: data.message ?? 'Action impossible pour l’instant. Réessaie.',
        }));
      }
    } catch {
      setMessages((current) => ({
        ...current,
        [entryId]: 'Connexion perdue. Réessaie.',
      }));
    } finally {
      setBusyId(null);
    }
  }, []);

  return (
    <>
      <Composer onSubmitted={onSubmitted} />
      <Pocket
        entries={entries}
        newId={newId}
        busyId={busyId}
        messages={messages}
        onAction={onAction}
      />
    </>
  );
}
