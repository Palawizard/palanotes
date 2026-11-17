'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { FolderItem } from '@/server/folders';

const SHOWN = 8;

interface Block {
  folder: FolderItem;
  share: number;
  size: 'large' | 'medium' | 'small';
}

// The binder seen as a massing model: one block per top-level folder, its width following
// its share of the notes. The largest come first and set the height of their band.
function layout(roots: FolderItem[]): Block[] {
  const total = roots.reduce((sum, folder) => sum + folder.totalCount, 0);
  return [...roots]
    .sort((a, b) => b.totalCount - a.totalCount)
    .slice(0, SHOWN)
    .map((folder) => {
      const share = total > 0 ? folder.totalCount / total : 1 / roots.length;
      const size = share >= 0.3 ? 'large' : share >= 0.12 ? 'medium' : 'small';
      return { folder, share, size };
    });
}

function current(pathname: string, id: string): boolean {
  return pathname === `/dossiers/${id}`;
}

export function FolderMassing({ roots }: { roots: FolderItem[] }) {
  const pathname = usePathname();
  const total = roots.reduce((sum, folder) => sum + folder.totalCount, 0);
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
      <div className="massing" aria-hidden="true">
        {layout(roots).map(({ folder, share, size }) => (
          <Link
            key={folder.id}
            href={`/dossiers/${folder.id}`}
            tabIndex={-1}
            className="mass"
            data-hue={folder.hue ?? 'none'}
            data-current={current(pathname, folder.id) || undefined}
            data-size={size}
            style={{ flexGrow: Math.round(share * 100), flexBasis: `${share * 100}%` }}
            title={`${folder.name}, ${folder.totalCount}`}
          >
            <span className="mass-name">{folder.name}</span>
            <span className="mass-count">{folder.totalCount}</span>
          </Link>
        ))}
      </div>
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
