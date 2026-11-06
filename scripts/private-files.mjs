// Files that hold private working notes and must never reach this public repository.
const FORBIDDEN_NAMES = [/^claude\.md$/i, /^agents\.md$/i, /^product\.md$/i, /^design\.md$/i];
// Upper-case prefixes match any file; in other cases only markdown, so code such as
// planner-view.tsx stays allowed.
const FORBIDDEN_PREFIXES = [/^HANDOFF/, /^PLAN/, /^RESEARCH/];
const FORBIDDEN_MARKDOWN_PREFIXES = [/^handoff/i, /^plan/i, /^research/i];
const FORBIDDEN_DIRS = [/^\.claude$/i, /^\.impeccable$/i];

export function isPrivatePath(path) {
  const segments = path.replaceAll('\\', '/').split('/').filter(Boolean);
  const name = segments.at(-1) ?? '';
  if (segments.slice(0, -1).some((dir) => FORBIDDEN_DIRS.some((re) => re.test(dir)))) {
    return true;
  }
  if (FORBIDDEN_DIRS.some((re) => re.test(name))) {
    return true;
  }
  return (
    FORBIDDEN_NAMES.some((re) => re.test(name)) ||
    FORBIDDEN_PREFIXES.some((re) => re.test(name)) ||
    (/\.mdx?$/i.test(name) && FORBIDDEN_MARKDOWN_PREFIXES.some((re) => re.test(name)))
  );
}
