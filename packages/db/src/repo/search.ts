import { sql, type SQL } from 'drizzle-orm';
import type { Db } from '../client';

export interface SearchHit {
  id: string;
  title: string;
  folderId: string;
  tags: string[];
  summary: string;
  createdAt: Date;
  updatedAt: Date;
  excerpt: string;
  // The beginning of the note, for the preview.
  opening: string;
}

export interface SearchFilters {
  // Notes of these folders only (a folder alone, or with its subfolders).
  folderIds?: readonly string[] | null;
  // Notes carrying every one of these tags.
  tags?: readonly string[];
  // Notes modified since this date.
  since?: Date | null;
}

// Markers placed by ts_headline around matched words; the UI turns them into <mark>.
export const HIGHLIGHT_START = '\u0001';
export const HIGHLIGHT_END = '\u0002';

// Typos are matched word against word (strict word similarity), so that a misspelled word
// still finds its note while an unrelated word no longer matches pieces of longer words.
const STRICT_SIMILARITY = 0.4;
// Shorter words are too ambiguous for typo matching and must match the full-text index.
const FUZZY_MIN_LENGTH = 4;
const OPENING_LENGTH = 700;

interface Row {
  id: string;
  title: string;
  folder_id: string;
  tags: string[];
  summary: string;
  created_at: Date | string;
  updated_at: Date | string;
  excerpt: string | null;
  opening: string;
}

function filterClauses(userId: string, filters: SearchFilters): SQL[] {
  const clauses = [sql`n.user_id = ${userId}`];
  if (filters.folderIds) {
    clauses.push(
      filters.folderIds.length === 0
        ? sql`false`
        : sql`n.folder_id in (${sql.join(
            filters.folderIds.map((id) => sql`${id}::uuid`),
            sql`, `,
          )})`,
    );
  }
  if (filters.tags && filters.tags.length > 0) {
    clauses.push(
      sql`n.tags @> array[${sql.join(
        filters.tags.map((tag) => sql`${tag}`),
        sql`, `,
      )}]::text[]`,
    );
  }
  if (filters.since) {
    clauses.push(sql`n.updated_at >= ${filters.since.toISOString()}::timestamptz`);
  }
  return clauses;
}

function toHit(row: Row): SearchHit {
  return {
    id: row.id,
    title: row.title,
    folderId: row.folder_id,
    tags: row.tags,
    summary: row.summary,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
    excerpt: row.excerpt ?? '',
    opening: row.opening,
  };
}

// Every word of the query must be found in the note, either by full-text search (French
// stems, accents ignored) or, for typos, by trigram similarity with a word of the note.
// Ranking favours full-text matches on the title, then summary and tags, then content.
// Filters narrow by folder, tags and date. Without a query, the filtered notes come newest
// first. Results come from the account only.
export async function searchNotes(
  db: Db,
  userId: string,
  query: string,
  filters: SearchFilters = {},
  limit = 30,
): Promise<SearchHit[]> {
  const text = query.trim().slice(0, 200);
  const where = sql.join(filterClauses(userId, filters), sql` and `);
  const hasFilter = Boolean(filters.folderIds || filters.tags?.length || filters.since);
  if (!text) {
    if (!hasFilter) {
      return [];
    }
    const rows = (await db.execute(sql`
      select n.id, n.title, n.folder_id, n.tags, n.summary, n.created_at, n.updated_at,
             null as excerpt, left(n.content, ${OPENING_LENGTH}) as opening
      from notes n
      where ${where}
      order by n.updated_at desc
      limit ${limit}
    `)) as unknown as Row[];
    return rows.map(toHit);
  }
  return db.transaction(async (tx) => {
    await tx.execute(
      sql`select set_config('pg_trgm.strict_word_similarity_threshold', ${String(STRICT_SIMILARITY)}, true)`,
    );
    const rows = (await tx.execute(sql`
      with q as (
        select websearch_to_tsquery('public.french_unaccent', ${text}) as tsq,
               lower(public.unaccent(${text})) as plain
      ),
      words as (
        select distinct word
        from q, regexp_split_to_table(q.plain, '[^[:alnum:]]+') as word
        where length(word) >= 2
      )
      select n.id, n.title, n.folder_id, n.tags, n.summary, n.created_at, n.updated_at,
             ts_headline('public.french_unaccent', n.content, q.tsq,
               ${`StartSel=${HIGHLIGHT_START}, StopSel=${HIGHLIGHT_END}, MaxWords=32, MinWords=12, MaxFragments=2, FragmentDelimiter=" … "`}) as excerpt,
             left(n.content, ${OPENING_LENGTH}) as opening
      from notes n, q
      where ${where}
        and (
          n.search @@ q.tsq
          or (
            exists (select 1 from words)
            and not exists (
              select 1 from words
              where not (
                n.search @@ plainto_tsquery('public.french_unaccent', words.word)
                or (length(words.word) >= ${FUZZY_MIN_LENGTH} and words.word <<% n.search_text)
              )
            )
          )
        )
      order by ts_rank_cd(n.search, q.tsq) * 2 + strict_word_similarity(q.plain, n.search_text) desc,
               n.updated_at desc
      limit ${limit}
    `)) as unknown as Row[];
    return rows.map(toHit);
  });
}

export interface TagCount {
  tag: string;
  count: number;
}

// The account's most used tags, for the search page before anything is typed.
export async function listTopTags(db: Db, userId: string, limit = 16): Promise<TagCount[]> {
  const rows = (await db.execute(sql`
    select tag, count(*)::int as count
    from notes n, unnest(n.tags) as tag
    where n.user_id = ${userId}
    group by tag
    order by count desc, tag
    limit ${limit}
  `)) as unknown as { tag: string; count: number }[];
  return rows.map((row) => ({ tag: row.tag, count: Number(row.count) }));
}
