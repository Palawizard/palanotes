// Open folders of the tree, kept in a cookie so the server renders the tree as it was left.
export const TREE_COOKIE = 'palanotes_tree';
const MAX_IDS = 80;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function parseTreeCookie(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split('.')
    .filter((id) => UUID.test(id))
    .slice(0, MAX_IDS);
}

export function serializeTreeCookie(ids: Iterable<string>): string {
  return [...ids]
    .filter((id) => UUID.test(id))
    .slice(0, MAX_IDS)
    .join('.');
}
