'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Icon } from './icons';

// The recent notes sit above the tree, like a pinned folder.
export function RecentLink() {
  const pathname = usePathname();
  const current = pathname === '/dossiers' || pathname === '/dossiers/recents';
  return (
    <Link
      href="/dossiers/recents"
      className="tree-row tree-pinned"
      data-current={current || undefined}
      aria-current={current ? 'page' : undefined}
    >
      <Icon name="clock" className="tree-icon" />
      <span className="tree-name">Récents</span>
    </Link>
  );
}

// The trash closes the tree, like the last tab of a binder.
export function TrashLink({ count }: { count: number }) {
  const pathname = usePathname();
  const current = pathname === '/dossiers/corbeille';
  return (
    <Link
      href="/dossiers/corbeille"
      className="tree-row tree-pinned tree-trash"
      data-current={current || undefined}
      aria-current={current ? 'page' : undefined}
    >
      <Icon name="trash" className="tree-icon" />
      <span className="tree-name">Corbeille</span>
      {count > 0 ? <span className="tree-count">{count}</span> : null}
    </Link>
  );
}
