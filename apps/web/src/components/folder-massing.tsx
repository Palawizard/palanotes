'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { squarify } from '@/lib/squarify';
import type { FolderItem } from '@/server/folders';

// The frame the blocks are laid out in, close to the rail's own proportions.
const FRAME = { width: 228, height: 144 };
export const FILED_EVENT = 'notes:filed';

// The binder seen as a massing model: one block per top-level folder holding notes, its
// area following its number of notes. Empty folders stay in the list below.
// Folders under this share of the notes are too small to read as volumes: they are
// gathered in one stone block, or the only one keeps its colour, drawn at that share.
const SMALL_SHARE = 0.06;

interface Block {
  key: string;
  name: string;
  count: number;
  hue: number | null;
  href: string;
  id: string | null;
}

function gather(roots: FolderItem[], total: number): Block[] {
  const full = roots
    .filter((folder) => folder.totalCount > 0)
    .sort((a, b) => b.totalCount - a.totalCount);
  const large = full.filter((folder) => folder.totalCount / total >= SMALL_SHARE);
  const small = full.filter((folder) => folder.totalCount / total < SMALL_SHARE);
  const blocks: Block[] = large.map((folder) => ({
    key: folder.id,
    name: folder.name,
    count: folder.totalCount,
    hue: folder.hue,
    href: `/dossiers/${folder.id}`,
    id: folder.id,
  }));
  const [only] = small;
  if (small.length === 1 && only) {
    blocks.push({
      key: only.id,
      name: only.name,
      count: only.totalCount,
      hue: only.hue,
      href: `/dossiers/${only.id}`,
      id: only.id,
    });
  } else if (small.length > 1) {
    blocks.push({
      key: 'rest',
      name: `${small.length} autres`,
      count: small.reduce((sum, folder) => sum + folder.totalCount, 0),
      hue: null,
      href: '/dossiers',
      id: null,
    });
  }
  return blocks;
}

function blocks(roots: FolderItem[], total: number) {
  const full = gather(roots, total);
  // The gathered block keeps a readable floor; every other area is exactly proportional.
  const rects = squarify(
    full.map((block) => Math.max(block.count, total * SMALL_SHARE)),
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
      named: rect.h >= 22,
      counted: rect.w >= 32 && rect.h >= 22,
    };
  });
}

function current(pathname: string, id: string): boolean {
  return pathname === `/dossiers/${id}`;
}

export function FolderMassing({ roots }: { roots: FolderItem[] }) {
  const pathname = usePathname();
  const [lifted, setLifted] = useState<number | null>(null);
  const massing = useRef<HTMLDivElement>(null);

  // A name whose longest word does not fit its block is hidden rather than broken; the list
  // below names every folder. Measured once the font is in.
  useEffect(() => {
    const frame = massing.current;
    if (!frame) return;
    let cancelled = false;
    const check = () => {
      if (cancelled) return;
      const range = document.createRange();
      for (const name of frame.querySelectorAll<HTMLElement>('.mass-name')) {
        name.hidden = false;
        range.selectNodeContents(name);
        // Subpixel width of the longest line, against the room left inside the padding.
        name.hidden = range.getBoundingClientRect().width > name.getBoundingClientRect().width - 1;
      }
    };
    void document.fonts.ready.then(check);
    const observer = new ResizeObserver(check);
    observer.observe(frame);
    return () => {
      cancelled = true;
      observer.disconnect();
    };
  }, [roots]);
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
        <div className="massing" aria-hidden="true" ref={massing}>
          {blocks(roots, total).map(({ folder, style, named, counted }) => (
            <Link
              key={folder.key}
              href={folder.href}
              tabIndex={-1}
              className="mass"
              data-hue={folder.hue ?? 'rest'}
              data-current={(folder.id !== null && current(pathname, folder.id)) || undefined}
              data-lifted={(folder.hue !== null && folder.hue === lifted) || undefined}
              style={style}
              title={`${folder.name}, ${folder.count}`}
            >
              {named ? <span className="mass-name">{folder.name}</span> : null}
              {counted ? <span className="mass-count">{folder.count}</span> : null}
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
