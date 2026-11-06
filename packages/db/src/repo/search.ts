import { sql } from 'drizzle-orm';
import type { Db } from '../client';

export interface SearchHit {
  id: string;
  title: string;
  folderId: string;
  tags: string[];
  updatedAt: Date;
  excerpt: string;
}

// Markers placed by ts_headline around matched words; the UI turns them into <mark>.
export const HIGHLIGHT_START = '\u0001';
export const HIGHLIGHT_END = '\u0002';

// Below the default 0.6 so that one typo in a word of six letters or more still matches.
const WORD_SIMILARITY = 0.4;

interface Row {
  id: string;
  title: string;
  folder_id: string;
  tags: string[];
  updated_at: Date | string;
  excerpt: string | null;
}

// Every word of the query must be found in the note, either by full-text search (French
// stems, accents ignored) or, for typos, by trigram word similarity. Ranking favours full-text
// matches on the title, then summary and tags, then content. Results come from the account only.
// The per-word check runs on the account's notes without an index: fine for one person's notes.
export async function searchNotes(
  db: Db,
  userId: string,
  query: string,
  limit = 30,
): Promise<SearchHit[]> {
  const text = query.trim().slice(0, 200);
  if (!text) {
    return [];
  }
  return db.transaction(async (tx) => {
    await tx.execute(
      sql`select set_config('pg_trgm.word_similarity_threshold', ${String(WORD_SIMILARITY)}, true)`,
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
      select n.id, n.title, n.folder_id, n.tags, n.updated_at,
             ts_headline('public.french_unaccent', n.content, q.tsq,
               ${`StartSel=${HIGHLIGHT_START}, StopSel=${HIGHLIGHT_END}, MaxWords=28, MinWords=10, MaxFragments=2, FragmentDelimiter=" … "`}) as excerpt
      from notes n, q
      where n.user_id = ${userId}
        and (
          n.search @@ q.tsq
          or (
            exists (select 1 from words)
            and not exists (
              select 1 from words
              where not (
                n.search @@ plainto_tsquery('public.french_unaccent', words.word)
                or words.word <% n.search_text
              )
            )
          )
        )
      order by ts_rank_cd(n.search, q.tsq) * 2 + word_similarity(q.plain, n.search_text) desc,
               n.updated_at desc
      limit ${limit}
    `)) as unknown as Row[];
    return rows.map((row) => ({
      id: row.id,
      title: row.title,
      folderId: row.folder_id,
      tags: row.tags,
      updatedAt: new Date(row.updated_at),
      excerpt: row.excerpt ?? '',
    }));
  });
}
