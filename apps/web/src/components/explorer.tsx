import Link from 'next/link';
import type { ReactNode } from 'react';
import type { NoteSort } from '@palanotes/core';
import type { NotePaneData } from '@/server/explorer';
import { Breadcrumb } from './breadcrumb';
import { Icon } from './icons';
import { NoteView } from './note-view';

export type ExplorerLevel = 'folders' | 'list' | 'note';

// Middle and right panes of the explorer. On a phone only the pane of `level` shows:
// folders, then a folder's notes, then one note.
export function ExplorerMain({
  level,
  list,
  note,
}: {
  level: ExplorerLevel;
  list: ReactNode;
  note: ReactNode;
}) {
  return (
    <div className="explorer-main" data-level={level}>
      <section className="explorer-list" aria-labelledby="list-title">
        {list}
      </section>
      <section className="explorer-note" aria-label="Note ouverte">
        {note}
      </section>
    </div>
  );
}

const SORTS: { value: NoteSort; label: string }[] = [
  { value: 'modifiee', label: 'Modifiée' },
  { value: 'creee', label: 'Créée' },
  { value: 'titre', label: 'Titre' },
];

export function SortLinks({
  current,
  hrefFor,
}: {
  current: NoteSort;
  hrefFor: (sort: NoteSort) => string;
}) {
  return (
    <nav className="sort" aria-label="Trier les notes">
      <Icon name="sort" className="sort-icon" />
      {SORTS.map((sort) => (
        <Link
          key={sort.value}
          href={hrefFor(sort.value)}
          className="sort-link"
          aria-current={sort.value === current ? 'true' : undefined}
          scroll={false}
        >
          {sort.label}
        </Link>
      ))}
    </nav>
  );
}

// « Back » one level, for the stacked panes of a phone or a narrow window.
export function BackLink({
  href,
  label,
  phoneOnly = false,
}: {
  href: string;
  label: string;
  phoneOnly?: boolean;
}) {
  return (
    <Link href={href} className="back-link" data-phone-only={phoneOnly || undefined}>
      <Icon name="chevronLeft" />
      {label}
    </Link>
  );
}

export function NotePane({
  note,
  backHref,
  backLabel,
}: {
  note: NotePaneData | null;
  backHref: string;
  backLabel: string;
}) {
  if (!note) {
    return (
      <div className="pane-empty">
        <Icon name="note" size={24} />
        <p>Choisis une note dans la liste pour la lire ici.</p>
      </div>
    );
  }
  return (
    <article className="note-pane" key={note.id}>
      <div className="pane-head note-pane-head">
        <BackLink href={backHref} label={backLabel} />
        <Breadcrumb
          label="Dossier de la note"
          endsHere={false}
          items={[
            ...note.trail.map((node) => ({ label: node.name, href: `/dossiers/${node.id}` })),
          ]}
        />
      </div>
      <div className="note-pane-body">
        <NoteView
          note={{
            id: note.id,
            title: note.title,
            content: note.content,
            tags: note.tags,
            folderId: note.folderId,
            updatedAt: note.updatedAt,
          }}
        />
      </div>
    </article>
  );
}
