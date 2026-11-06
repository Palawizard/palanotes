// The page or card already shows the title, so a first heading that repeats it is dropped.
export function withoutLeadingTitle(content: string, title: string): string {
  const match = /^\s*#{1,6}\s+(.+?)\s*(\n|$)/.exec(content);
  if (match && match[1]?.trim().toLowerCase() === title.trim().toLowerCase()) {
    return content.slice(match[0].length).trimStart();
  }
  return content;
}
