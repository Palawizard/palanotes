export const PERIODS = [
  { value: 'semaine', label: '7 derniers jours', days: 7 },
  { value: 'mois', label: '30 derniers jours', days: 30 },
  { value: 'annee', label: '12 derniers mois', days: 365 },
] as const;

export type Period = (typeof PERIODS)[number]['value'];

export interface SearchState {
  q: string;
  folder: string | null;
  // With the subfolders of `folder` (the default).
  sub: boolean;
  tags: string[];
  period: Period | null;
  shown: number;
}

export const RESULTS_PAGE = 30;
const MAX_TAGS = 5;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Raw = Record<string, string | string[] | undefined>;

function all(value: string | string[] | undefined): string[] {
  return value === undefined ? [] : Array.isArray(value) ? value : [value];
}

function one(value: string | string[] | undefined): string {
  return all(value)[0] ?? '';
}

// Reads the search from the address; anything malformed is dropped rather than refused.
export function parseSearch(raw: Raw): SearchState {
  const folder = one(raw.dossier);
  const period = PERIODS.find((entry) => entry.value === one(raw.periode))?.value ?? null;
  const tags = [
    ...new Set(
      all(raw.tag)
        .map((tag) => tag.trim())
        .filter((tag) => tag.length > 0 && tag.length <= 40),
    ),
  ].slice(0, MAX_TAGS);
  const shown = Number.parseInt(one(raw.n), 10);
  return {
    q: one(raw.q).trim().slice(0, 200),
    folder: UUID.test(folder) ? folder : null,
    sub: one(raw.sous) !== '0',
    tags,
    period,
    shown:
      Number.isFinite(shown) && shown > RESULTS_PAGE
        ? Math.min(Math.ceil(shown / RESULTS_PAGE) * RESULTS_PAGE, 200)
        : RESULTS_PAGE,
  };
}

export function hasFilters(state: SearchState): boolean {
  return Boolean(state.folder || state.tags.length > 0 || state.period);
}

// Address of the search with some changes; a new query or filter starts from the first page.
export function searchHref(state: SearchState, change: Partial<SearchState> = {}): string {
  const next = { ...state, shown: RESULTS_PAGE, ...change };
  const params = new URLSearchParams();
  if (next.q) params.set('q', next.q);
  if (next.folder) {
    params.set('dossier', next.folder);
    if (!next.sub) params.set('sous', '0');
  }
  for (const tag of next.tags) params.append('tag', tag);
  if (next.period) params.set('periode', next.period);
  if (next.shown > RESULTS_PAGE) params.set('n', String(next.shown));
  const query = params.toString();
  return `/recherche${query ? `?${query}` : ''}`;
}

export function periodStart(period: Period | null, now = new Date()): Date | null {
  const entry = PERIODS.find((item) => item.value === period);
  return entry ? new Date(now.getTime() - entry.days * 86_400_000) : null;
}

// The search to come back to from a note: only our own search page is accepted.
export function safeReturn(raw: string | string[] | undefined): string | null {
  const value = one(raw);
  return value.startsWith('/recherche') && !value.startsWith('//') ? value : null;
}
