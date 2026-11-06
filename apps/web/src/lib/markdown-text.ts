// The page or card already shows the title, so a first heading that repeats it is dropped.
export function withoutLeadingTitle(content: string, title: string): string {
  const match = /^\s*#{1,6}\s+(.+?)\s*(\n|$)/.exec(content);
  if (match && match[1]?.trim().toLowerCase() === title.trim().toLowerCase()) {
    return content.slice(match[0].length).trimStart();
  }
  return content;
}

// Plain text for an excerpt: Markdown markers (headings, lists, emphasis, quotes, tables,
// code fences, link targets) removed, whitespace collapsed.
export function plainExcerpt(text: string): string {
  return text
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/^\s*(#{1,6}|[-*+]|>|\d+\.)\s+/gm, '')
    .replace(/^\s*\|?[\s|:-]+\|?\s*$/gm, ' ')
    .replace(/[*_`|]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const START = '\u0001';
const END = '\u0002';

function normalize(word: string): string {
  return word
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();
}

function trigrams(word: string): Set<string> {
  const padded = `  ${word} `;
  const set = new Set<string>();
  for (let index = 0; index < padded.length - 2; index += 1) {
    set.add(padded.slice(index, index + 3));
  }
  return set;
}

// Same measure as pg_trgm's similarity(): shared trigrams over all trigrams.
export function trigramSimilarity(a: string, b: string): number {
  const left = trigrams(normalize(a));
  const right = trigrams(normalize(b));
  let shared = 0;
  for (const gram of left) {
    if (right.has(gram)) shared += 1;
  }
  return shared / (left.size + right.size - shared);
}

function withoutMarkers(text: string): string {
  return text.replaceAll(START, '').replaceAll(END, '');
}

// Drops the first `length` visible characters, skipping highlight markers.
function dropVisible(text: string, length: number): string {
  let seen = 0;
  let index = 0;
  while (index < text.length && seen < length) {
    if (text[index] !== START && text[index] !== END) seen += 1;
    index += 1;
  }
  return text.slice(index).replace(new RegExp(`^${END}`), '');
}

function queryWordsOf(query: string): string[] {
  return normalize(query)
    .split(/[^\p{L}\p{N}]+/u)
    .filter((word) => word.length >= 3);
}

// Marks the words of `text` equal or close (typo) to a word of the query.
export function markSimilarWords(text: string, query: string): string {
  const queryWords = queryWordsOf(query);
  if (queryWords.length === 0) {
    return text;
  }
  return text.replace(/[\p{L}\p{N}]{2,}/gu, (word) =>
    queryWords.some(
      (queryWord) => normalize(word) === queryWord || trigramSimilarity(word, queryWord) >= 0.4,
    )
      ? `${START}${word}${END}`
      : word,
  );
}

// Excerpt as shown under a search result: plain text, without a leading copy of the title,
// with an ellipsis when it was cut, and with words close to a misspelled query word marked.
export function displayExcerpt(raw: string, title: string, query: string): string {
  let text = plainExcerpt(raw);
  const bare = withoutMarkers(text);
  if (title && normalize(bare).startsWith(normalize(title))) {
    text = dropVisible(text, title.length).replace(/^[\s:–-]+/, '');
  }
  if (text.split(START).length === 1) {
    text = markSimilarWords(text, query);
  }
  const visible = withoutMarkers(text).trim();
  if (visible && !/[.!?…]$/.test(visible)) {
    text = `${text.trimEnd()} …`;
  }
  return text;
}
