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
