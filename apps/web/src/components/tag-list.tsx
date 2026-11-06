import Link from 'next/link';

// Tags as small labels; with `hrefOf`, each one leads to the notes sharing it.
export function TagList({
  tags,
  hrefOf,
  label = 'Tags',
}: {
  tags: string[];
  hrefOf?: (tag: string) => string;
  label?: string;
}) {
  if (tags.length === 0) {
    return null;
  }
  return (
    <ul className="tags" aria-label={label}>
      {tags.map((tag) => (
        <li key={tag}>
          {hrefOf ? (
            <Link className="tag" href={hrefOf(tag)}>
              {tag}
            </Link>
          ) : (
            <span className="tag">{tag}</span>
          )}
        </li>
      ))}
    </ul>
  );
}
