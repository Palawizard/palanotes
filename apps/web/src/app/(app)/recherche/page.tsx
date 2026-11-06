import type { Metadata } from 'next';
import Link from 'next/link';
import { searchNotes } from '@palanotes/db';
import { Highlighted } from '@/components/highlighted';
import { formatWhen } from '@/lib/format';
import { plainExcerpt } from '@/lib/markdown-text';
import { getCurrentUser } from '@/server/auth';
import { getDb } from '@/server/db';
import { loadFolderTree } from '@/server/folders';

export const metadata: Metadata = { title: 'Recherche' };

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string | string[] }>;
}) {
  const user = await getCurrentUser();
  if (!user) {
    return null;
  }
  const raw = (await searchParams).q;
  const query = (Array.isArray(raw) ? raw[0] : raw)?.trim().slice(0, 200) ?? '';
  const db = getDb();
  const [hits, tree] = query
    ? await Promise.all([searchNotes(db, user.id, query), loadFolderTree(db, user.id)])
    : [[], null];

  return (
    <div className="page-stack">
      <h1 className="page-title">Recherche</h1>
      <form className="search-form" role="search" action="" method="get">
        <label htmlFor="q" className="sr-only">
          Chercher dans tes notes
        </label>
        <input
          id="q"
          name="q"
          type="search"
          className="field search-field"
          defaultValue={query}
          placeholder="Par exemple : modèle OSI, crêpes, dentiste"
          autoFocus
          autoComplete="off"
          enterKeyHint="search"
        />
        <button type="submit" className="button">
          Chercher
        </button>
      </form>
      {!query ? (
        <p className="empty-state">
          Un mot suffit, même mal orthographié ou sans accents. La recherche regarde les titres, les
          résumés, les tags et le texte de toutes tes notes, quel que soit leur dossier.
        </p>
      ) : hits.length === 0 ? (
        <p className="empty-state">
          Rien trouvé pour « {query} ». Essaie un autre mot, ou un mot plus court.
        </p>
      ) : (
        <section aria-labelledby="results-title" className="page-stack">
          <h2 className="section-title" id="results-title">
            {hits.length} {hits.length > 1 ? 'notes trouvées' : 'note trouvée'}
          </h2>
          <ul className="note-list">
            {hits.map((hit) => (
              <li key={hit.id} className="note-item">
                <Link href={`/note/${hit.id}`} className="note-link">
                  {hit.title}
                </Link>
                {hit.excerpt ? (
                  <p className="note-summary search-excerpt">
                    <Highlighted text={plainExcerpt(hit.excerpt)} />
                  </p>
                ) : null}
                <p className="note-meta">
                  <span>{tree?.byId.get(hit.folderId)?.path ?? ''}</span>
                  <time dateTime={hit.updatedAt.toISOString()}>
                    {formatWhen(hit.updatedAt.toISOString())}
                  </time>
                  {hit.tags.length > 0 ? <span>{hit.tags.join(', ')}</span> : null}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
