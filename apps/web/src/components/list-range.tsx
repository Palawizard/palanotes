'use client';

import { useEffect, useState } from 'react';

// For a long list sorted by title: the first and last titles in view, like the guide words
// at the top of a dictionary page. Rows carry their title in data-label.
export function ListRange({ listId }: { listId: string }) {
  const [range, setRange] = useState<{ first: string; last: string } | null>(null);

  useEffect(() => {
    const list = document.getElementById(listId);
    if (!list) return;
    const rows = [...list.querySelectorAll<HTMLElement>('[data-label]')];
    const visible = new Set<HTMLElement>();
    const update = () => {
      const shown = rows.filter((row) => visible.has(row));
      const first = shown[0]?.dataset.label;
      const last = shown.at(-1)?.dataset.label;
      setRange(first && last && shown.length < rows.length ? { first, last } : null);
    };
    const observer = new IntersectionObserver((records) => {
      for (const record of records) {
        const row = record.target as HTMLElement;
        if (record.isIntersecting) visible.add(row);
        else visible.delete(row);
      }
      update();
    });
    for (const row of rows) observer.observe(row);
    return () => observer.disconnect();
  }, [listId]);

  if (!range) return null;
  return (
    <p className="list-range" aria-hidden="true">
      De «{' '}
      <span className="list-range-word">{range.first}</span>
      {' '}» à «{' '}
      <span className="list-range-word">{range.last}</span>
      {' '}»
    </p>
  );
}
