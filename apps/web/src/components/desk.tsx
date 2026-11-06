'use client';

import { useCallback, useEffect, useState } from 'react';
import type { EntryView } from '@/server/entry-view';
import { apiPath } from '@/lib/paths';
import { Composer } from './composer';
import { Pocket } from './pocket';

const POLL_MS = 2500;
const UNSETTLED = new Set(['pending', 'processing']);

export function Desk({ initialEntries }: { initialEntries: EntryView[] }) {
  const [entries, setEntries] = useState(initialEntries);
  const [newId, setNewId] = useState<string | null>(null);
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

  return (
    <>
      <Composer onSubmitted={onSubmitted} />
      <Pocket entries={entries} newId={newId} />
    </>
  );
}
