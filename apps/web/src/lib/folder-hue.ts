// Each top-level folder gets one of the programme colours of the interface. The colour is not
// stored: it follows the order in which the top-level folders were created, so a new folder
// takes the next colour and the existing ones keep theirs.
export const HUE_COUNT = 7;

export interface HueFolder {
  id: string;
  parentId: string | null;
  name: string;
  createdAt: Date;
}

export function rootHues(folders: readonly HueFolder[]): Map<string, number> {
  const roots = folders
    .filter((folder) => folder.parentId === null)
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime() || a.id.localeCompare(b.id));
  return new Map(roots.map((root, index) => [root.id, index % HUE_COUNT]));
}

// The hue of any folder: the one of its top-level ancestor.
export function folderHue(
  folderId: string,
  folders: ReadonlyMap<string, Pick<HueFolder, 'parentId'>>,
  hues: ReadonlyMap<string, number>,
): number | null {
  let current: string | null = folderId;
  const seen = new Set<string>();
  while (current && !seen.has(current)) {
    seen.add(current);
    const parent: string | null | undefined = folders.get(current)?.parentId;
    if (parent === undefined) return null;
    if (parent === null) return hues.get(current) ?? null;
    current = parent;
  }
  return null;
}

const collator = new Intl.Collator('fr', { sensitivity: 'base' });

// The hue of a path the sorting proposes, which may name folders that do not exist yet:
// its first part is matched against the top-level folders by name.
export function pathHue(
  path: string,
  folders: readonly HueFolder[],
  hues: ReadonlyMap<string, number>,
): number | null {
  const first = path.split('/')[0]?.trim();
  if (!first) return null;
  const root = folders.find(
    (folder) => folder.parentId === null && collator.compare(folder.name, first) === 0,
  );
  return root ? (hues.get(root.id) ?? null) : null;
}
