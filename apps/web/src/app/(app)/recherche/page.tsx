import type { Metadata } from 'next';
import Link from 'next/link';
import { subtreeIds } from '@palanotes/core';
import { listTopTags, searchNotes, type SearchHit } from '@palanotes/db';
import { ResultCard } from '@/components/result-card';
import {
  activeChips,
  FilterChips,
  RefineGroup,
  SearchForm,
  type Facet,
} from '@/components/search-parts';
import {
  hasFilters,
  parseSearch,
  PERIODS,
  periodStart,
  RESULTS_PAGE,
  searchHref,
  type SearchState,
} from '@/lib/search-url';
import { getCurrentUser } from '@/server/auth';
import { getDb } from '@/server/db';
import { flattenTree, loadFolderTree, type FolderTree } from '@/server/folders';

export const metadata: Metadata = { title: 'Recherche' };

// Results considered for the filter counts; the page shows them 30 at a time.
const FACET_POOL = 200;

function facets(all: SearchHit[], state: SearchState, tree: FolderTree, now: Date) {
  const folderCounts = new Map<string, number>();
  const tagCounts = new Map<string, number>();
  for (const hit of all) {
    folderCounts.set(hit.folderId, (folderCounts.get(hit.folderId) ?? 0) + 1);
    for (const tag of hit.tags) tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
  }
  const folders: Facet[] = [...folderCounts]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([id, count]) => ({
      key: id,
      label: tree.byId.get(id)?.path ?? '',
      count,
      href: searchHref(state, { folder: id, sub: false }),
      active: state.folder === id,
    }));
  const tags: Facet[] = [...tagCounts]
    .filter(([tag]) => !state.tags.includes(tag))
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'fr'))
    .slice(0, 10)
    .map(([tag, count]) => ({
      key: tag,
      label: tag,
      count,
      href: searchHref(state, { tags: [...state.tags, tag] }),
      active: false,
    }));
  const periods: Facet[] = PERIODS.map((period) => {
    const since = periodStart(period.value, now)?.getTime() ?? 0;
    return {
      key: period.value,
      label: period.label,
      count: all.filter((hit) => hit.updatedAt.getTime() >= since).length,
      href: searchHref(state, { period: state.period === period.value ? null : period.value }),
      active: state.period === period.value,
    };
  }).filter((facet) => facet.count > 0 || facet.active);
  return { folders, tags, periods };
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await getCurrentUser();
  if (!user) {
    return null;
  }
  const state = parseSearch(await searchParams);
  const db = getDb();
  const tree = await loadFolderTree(db, user.id);
  const searching = Boolean(state.q) || hasFilters(state);
  const now = new Date();
  const folderIds = state.folder
    ? state.sub
      ? [...subtreeIds(flattenTree(tree), state.folder)]
      : [state.folder]
    : null;
  const [all, topTags] = await Promise.all([
    searching
      ? searchNotes(
          db,
          user.id,
          state.q,
          { folderIds, tags: state.tags, since: periodStart(state.period, now) },
          FACET_POOL,
        )
      : Promise.resolve([]),
    searching ? Promise.resolve([]) : listTopTags(db, user.id),
  ]);
  const hits = all.slice(0, state.shown);
  const here = searchHref(state, { shown: state.shown });
  const folderPath = state.folder ? (tree.byId.get(state.folder)?.path ?? null) : null;
  const chips = activeChips(state, folderPath);
  const groups = facets(all, state, tree, now);
  const tagHref = (tag: string) =>
    searchHref(state, { tags: state.tags.includes(tag) ? state.tags : [...state.tags, tag] });
  const count = all.length >= FACET_POOL ? `Plus de ${FACET_POOL - 1}` : String(all.length);

  const refine = (
    <>
      {state.folder ? (
        <Link
          className="refine-toggle"
          href={searchHref(state, { sub: !state.sub })}
          aria-pressed={state.sub}
          role="button"
        >
          <span className="refine-box" aria-hidden="true" data-checked={state.sub || undefined} />
          Inclure les sous-dossiers
        </Link>
      ) : null}
      <RefineGroup title="Période" facets={groups.periods} icon="calendar" />
      <RefineGroup title="Dossiers" facets={groups.folders} icon="folder" />
      <RefineGroup title="Tags" facets={groups.tags} icon="tag" />
    </>
  );

  return (
    <div className="search-page">
      <header className="search-head">
        <h1 className="page-title">Recherche</h1>
        <SearchForm state={state} />
        <FilterChips
          chips={chips}
          clearHref={searchHref(state, { folder: null, tags: [], period: null })}
        />
      </header>

      {!searching ? (
        <section className="search-idle" aria-labelledby="idle-title">
          <p className="empty-state">
            Un mot suffit, même mal orthographié ou sans accents. La recherche regarde les titres,
            les résumés, les tags et le texte de toutes tes notes, quel que soit leur dossier.
          </p>
          {topTags.length > 0 ? (
            <>
              <h2 className="section-title" id="idle-title">
                Tes tags les plus utilisés
              </h2>
              <ul className="tags idle-tags">
                {topTags.map((entry) => (
                  <li key={entry.tag}>
                    <Link className="tag" href={searchHref(state, { tags: [entry.tag] })}>
                      {entry.tag} <span className="tag-count">{entry.count}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </section>
      ) : (
        <div className="search-body">
          <section className="results" aria-labelledby="results-title">
            <h2 className="results-count" id="results-title">
              {all.length === 0
                ? 'Aucune note'
                : `${count} note${all.length > 1 ? 's' : ''}${state.q ? ` pour « ${state.q} »` : ''}`}
            </h2>
            {all.length > 0 ? (
              <details className="refine refine-phone">
                <summary>Affiner</summary>
                <div className="refine-body">{refine}</div>
              </details>
            ) : null}
            {hits.length === 0 ? (
              <div className="no-result">
                <p>
                  {state.q ? `Rien trouvé pour « ${state.q} »` : 'Aucune note'}
                  {chips.length > 0 ? ' avec ces filtres.' : '.'}
                </p>
                {chips.length > 0 ? (
                  <ul className="no-result-tries">
                    {chips.map((chip) => (
                      <li key={chip.key}>
                        <Link href={chip.removeHref}>
                          Chercher sans le filtre {chip.label.toLowerCase()} « {chip.value} »
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="empty-state">Essaie un autre mot, ou un mot plus court.</p>
                )}
              </div>
            ) : (
              <ol className="result-list">
                {hits.map((hit) => (
                  <li key={hit.id}>
                    <ResultCard
                      hit={hit}
                      query={state.q}
                      folderPath={tree.byId.get(hit.folderId)?.path ?? ''}
                      href={`/note/${hit.id}?depuis=${encodeURIComponent(here)}`}
                      activeTags={state.tags}
                      tagHref={tagHref}
                      now={now}
                    />
                  </li>
                ))}
              </ol>
            )}
            {all.length > hits.length ? (
              <Link
                className="show-more"
                href={searchHref(state, { shown: state.shown + RESULTS_PAGE })}
                scroll={false}
              >
                Afficher {Math.min(RESULTS_PAGE, all.length - hits.length)} résultats de plus
              </Link>
            ) : null}
          </section>
          {all.length > 0 ? (
            <aside className="refine refine-wide" aria-label="Affiner">
              {refine}
            </aside>
          ) : null}
        </div>
      )}
    </div>
  );
}
