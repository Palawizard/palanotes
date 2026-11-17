'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState, type CSSProperties } from 'react';
import { squarify } from '@/lib/squarify';
import type { FolderItem } from '@/server/folders';

// The frame the blocks are laid out in, close to the rail's own proportions.
const FRAME = { width: 228, height: 144 };
export const FILED_EVENT = 'notes:filed';

// The binder seen as a massing model: one block per top-level folder holding notes, its
// area following its number of notes. Empty folders stay in the list below.
function blocks(roots: FolderItem[]) {
  const full = roots
    .filter((folder) => folder.totalCount > 0)
    .sort((a, b) => b.totalCount - a.totalCount);
  const rects = squarify(
    full.map((folder) => folder.totalCount),
    FRAME.width,
    FRAME.height,
  );
  return full.map((folder, index) => {
    const rect = rects[index] ?? { x: 0, y: 0, w: 0, h: 0 };
    return {
      folder,
      style: {
        left: `${(rect.x / FRAME.width) * 100}%`,
        top: `${(rect.y / FRAME.height) * 100}%`,
        width: `calc(${(rect.w / FRAME.width) * 100}% - 8px)`,
        height: `calc(${(rect.h / FRAME.height) * 100}% - 8px)`,
      } satisfies CSSProperties,
      // Text only where it fits on one word per line; the list below names every folder.
      named: rect.w >= 54 && rect.h >= 22,
      counted: rect.w >= 54 && rect.h >= 44,
    };
  });
}

function current(pathname: string, id: string): boolean {
  return pathname === `/dossiers/${id}`;
}

export function FolderMassing({ roots }: { roots: FolderItem[] }) {
  const pathname = usePathname();
  const [lifted, setLifted] = useState<number | null>(null);
  const total = roots.reduce((sum, folder) => sum + folder.totalCount, 0);

  // A filed entry lifts the block of the folder it went to, for a moment.
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const onFiled = (event: Event) => {
      const hue = (event as CustomEvent<{ hue: number | null }>).detail.hue;
      if (hue === null) return;
      setLifted(hue);
      clearTimeout(timer);
      timer = setTimeout(() => setLifted(null), 900);
    };
    window.addEventListener(FILED_EVENT, onFiled);
    return () => {
      window.removeEventListener(FILED_EVENT, onFiled);
      clearTimeout(timer);
    };
  }, []);

  if (roots.length === 0) {
    return (
      <section className="binder" aria-labelledby="binder-title">
        <h2 className="binder-title" id="binder-title">
          Classeur
        </h2>
        <p className="binder-empty">Tes notes rangées apparaîtront ici, dossier par dossier.</p>
      </section>
    );
  }
  return (
    <section className="binder" aria-labelledby="binder-title">
      <h2 className="binder-title" id="binder-title">
        <span>Classeur</span>
        <span className="binder-total">
          {total} note{total > 1 ? 's' : ''}
        </span>
      </h2>
      {total > 0 ? (
        <div className="massing" aria-hidden="true">
          {blocks(roots).map(({ folder, style, named, counted }) => (
            <Link
              key={folder.id}
              href={`/dossiers/${folder.id}`}
              tabIndex={-1}
              className="mass"
              data-hue={folder.hue ?? 'none'}
              data-current={current(pathname, folder.id) || undefined}
              data-lifted={(folder.hue !== null && folder.hue === lifted) || undefined}
              style={style}
              title={`${folder.name}, ${folder.totalCount}`}
            >
              {named ? <span className="mass-name">{folder.name}</span> : null}
              {counted ? <span className="mass-count">{folder.totalCount}</span> : null}
            </Link>
          ))}
        </div>
      ) : null}
      <ul className="binder-list">
        {roots.map((folder) => (
          <li key={folder.id}>
            <Link
              href={`/dossiers/${folder.id}`}
              className="binder-row"
              data-hue={folder.hue ?? 'none'}
              aria-current={current(pathname, folder.id) ? 'page' : undefined}
            >
              <span className="cube" />
              <span className="binder-name">{folder.name}</span>
              <span className="binder-count">{folder.totalCount}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
