const MAX_DEPTH = 6;
const MAX_SEGMENT_LENGTH = 80;

export type FolderPath = readonly string[];

export function parseFolderPath(raw: string): FolderPath {
  const segments = raw
    .split('/')
    .map((segment) => segment.trim().replace(/\s+/g, ' '))
    .filter((segment) => segment.length > 0);

  if (segments.length === 0) {
    throw new Error('folder path is empty');
  }
  if (segments.length > MAX_DEPTH) {
    throw new Error(`folder path is deeper than ${MAX_DEPTH} levels`);
  }
  for (const segment of segments) {
    if (segment.length > MAX_SEGMENT_LENGTH) {
      throw new Error(`folder name is longer than ${MAX_SEGMENT_LENGTH} characters`);
    }
    if (segment === '.' || segment === '..') {
      throw new Error('folder name cannot be . or ..');
    }
  }
  return segments;
}

export function formatFolderPath(path: FolderPath): string {
  return path.join(' / ');
}
