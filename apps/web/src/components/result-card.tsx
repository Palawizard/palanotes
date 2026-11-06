import Link from 'next/link';
import type { SearchHit } from '@palanotes/db';
import { formatFull, formatShort } from '@/lib/format';
import { displayExcerpt, markSimilarWords, openingOf, plainExcerpt } from '@/lib/markdown-text';
import { Highlighted } from './highlighted';
import { Icon } from './icons';
import { Markdown } from './markdown';

// One search result: a card with the title, the folder, the date, the tags and an excerpt
// with the matched words. On a wide screen, hovering or focusing it shows the beginning of
// the note beside it.
export function ResultCard({
  hit,
  query,
  folderPath,
  href,
  activeTags,
  tagHref,
  now,
}: {
  hit: SearchHit;
  query: string;
  folderPath: string;
  href: string;
  activeTags: string[];
  tagHref: (tag: string) => string;
  now: Date;
}) {
  const excerpt = query
    ? displayExcerpt(hit.excerpt, hit.title, query)
    : plainExcerpt(hit.summary || openingOf(hit.opening, hit.title, 200));
  return (
    <article className="result">
      <Link href={href} className="result-link">
        <h3 className="result-title">
          <Highlighted text={query ? markSimilarWords(hit.title, query) : hit.title} />
        </h3>
        <span className="result-meta">
          <span className="result-path">
            <Icon name="folder" size={14} />
            {folderPath}
          </span>
          <time
            dateTime={hit.updatedAt.toISOString()}
            title={formatFull(hit.updatedAt.toISOString())}
          >
            {formatShort(hit.updatedAt.toISOString(), now)}
          </time>
        </span>
        {excerpt ? (
          <span className="result-excerpt">
            <Highlighted text={excerpt} />
          </span>
        ) : null}
      </Link>
      {hit.tags.length > 0 ? (
        <ul className="tags result-tags" aria-label="Tags">
          {hit.tags.map((tag) => (
            <li key={tag}>
              <Link
                className="tag"
                href={tagHref(tag)}
                data-active={activeTags.includes(tag) || undefined}
                aria-label={`Filtrer sur le tag ${tag}`}
              >
                {tag}
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
      <div className="result-preview" aria-hidden="true">
        <p className="result-preview-title">{hit.title}</p>
        <Markdown>{openingOf(hit.opening, hit.title)}</Markdown>
      </div>
    </article>
  );
}
