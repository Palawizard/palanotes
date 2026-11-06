import Link from 'next/link';
import { PERIODS, searchHref, type SearchState } from '@/lib/search-url';
import { Icon } from './icons';

// GET form: works without script, keeps the active filters when the words change.
export function SearchForm({ state }: { state: SearchState }) {
  return (
    <form className="search-form" role="search" action="" method="get">
      <label htmlFor="q" className="sr-only">
        Chercher dans tes notes
      </label>
      <div className="search-box">
        <Icon name="search" />
        <input
          id="q"
          name="q"
          type="search"
          className="field search-field"
          defaultValue={state.q}
          placeholder="Par exemple : modèle OSI, crêpes, dentiste"
          autoFocus={!state.q}
          autoComplete="off"
          enterKeyHint="search"
        />
        {state.q ? (
          <Link
            href={searchHref(state, { q: '' })}
            className="search-clear"
            aria-label="Effacer les mots cherchés"
          >
            <Icon name="close" />
          </Link>
        ) : null}
      </div>
      {state.folder ? <input type="hidden" name="dossier" value={state.folder} /> : null}
      {state.folder && !state.sub ? <input type="hidden" name="sous" value="0" /> : null}
      {state.tags.map((tag) => (
        <input key={tag} type="hidden" name="tag" value={tag} />
      ))}
      {state.period ? <input type="hidden" name="periode" value={state.period} /> : null}
      <button type="submit" className="button">
        Chercher
      </button>
    </form>
  );
}

export interface Chip {
  key: string;
  label: string;
  value: string;
  removeHref: string;
}

export function activeChips(state: SearchState, folderPath: string | null): Chip[] {
  const chips: Chip[] = [];
  if (state.folder) {
    chips.push({
      key: 'folder',
      label: state.sub ? 'Dossier' : 'Dossier seul',
      value: folderPath ?? 'dossier supprimé',
      removeHref: searchHref(state, { folder: null, sub: true }),
    });
  }
  for (const tag of state.tags) {
    chips.push({
      key: `tag-${tag}`,
      label: 'Tag',
      value: tag,
      removeHref: searchHref(state, { tags: state.tags.filter((other) => other !== tag) }),
    });
  }
  if (state.period) {
    chips.push({
      key: 'period',
      label: 'Période',
      value: PERIODS.find((entry) => entry.value === state.period)?.label ?? '',
      removeHref: searchHref(state, { period: null }),
    });
  }
  return chips;
}

export function FilterChips({ chips, clearHref }: { chips: Chip[]; clearHref: string }) {
  if (chips.length === 0) return null;
  return (
    <div className="search-chips">
      <ul aria-label="Filtres actifs">
        {chips.map((chip) => (
          <li key={chip.key}>
            <Link
              href={chip.removeHref}
              className="chip"
              aria-label={`${chip.label} ${chip.value}, retirer ce filtre`}
            >
              <span className="chip-label">{chip.label}</span> {chip.value}
              <span className="chip-remove">
                <Icon name="close" size={12} />
              </span>
            </Link>
          </li>
        ))}
      </ul>
      {chips.length > 1 ? (
        <Link href={clearHref} className="search-clear-all">
          Retirer tous les filtres
        </Link>
      ) : null}
    </div>
  );
}

export interface Facet {
  key: string;
  label: string;
  count: number;
  href: string;
  active: boolean;
}

export function RefineGroup({
  title,
  facets,
  icon,
}: {
  title: string;
  facets: Facet[];
  icon: 'folder' | 'tag' | 'calendar';
}) {
  if (facets.length === 0) return null;
  return (
    <section className="refine-group" aria-label={title}>
      <h3 className="refine-title">{title}</h3>
      <ul className="refine-list">
        {facets.map((facet) => (
          <li key={facet.key}>
            <Link
              href={facet.href}
              className="refine-link"
              aria-current={facet.active ? 'true' : undefined}
            >
              <Icon name={facet.active ? 'check' : icon} size={14} />
              <span className="refine-label">{facet.label}</span>
              <span className="refine-count">{facet.count}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
