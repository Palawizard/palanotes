import { z } from 'zod';
import { buildFolderPaths, formatFolderPath } from '@palanotes/core';
import {
  authenticatePersonalToken,
  HIGHLIGHT_END,
  HIGHLIGHT_START,
  listFolders,
  listRecentNoteRows,
  searchNotes,
  type Db,
  type User,
} from '@palanotes/db';
import { explorerHref } from '@/lib/explorer-url';
import type { RateLimiter } from './rate-limit';
import { entryContent, submitEntry, type QueueSortEntry } from './submit-entry';

// Routes for the owner's other apps (`/api/v1/*`). They take a personal token in the
// Authorization header and nothing else: the session cookie is never read here, and the
// token is accepted nowhere else.

export interface ApiDeps {
  db: Db;
  basePath: string;
  queue: QueueSortEntry;
  limiter: RateLimiter;
}

export interface ApiNote {
  id: string;
  title: string;
  folderPath: string;
  updatedAt: string;
  path: string;
}

export interface ApiSearchNote extends ApiNote {
  excerpt: string;
}

const MAX_LIMIT = 50;
const MAX_QUERY_LENGTH = 200;

function json(body: unknown, status = 200): Response {
  return Response.json(body, { status, headers: { 'cache-control': 'no-store' } });
}

const unauthorized = (): Response => json({ error: 'unauthorized' }, 401);
const invalidRequest = (): Response => json({ error: 'invalid_request' }, 400);

function bearerToken(headers: Headers): string | null {
  const match = /^Bearer +(\S+) *$/i.exec(headers.get('authorization') ?? '');
  return match?.[1] ?? null;
}

async function authenticate(request: Request, deps: ApiDeps): Promise<User | Response> {
  const token = bearerToken(request.headers);
  const found = token ? await authenticatePersonalToken(deps.db, token) : null;
  if (!found) {
    return unauthorized();
  }
  if (!deps.limiter.allow(found.tokenId)) {
    return json({ error: 'rate_limited' }, 429);
  }
  return found.user;
}

// A missing limit takes the default; anything other than a whole number from 1 to 50 is refused.
export function parseLimit(raw: string | null, fallback: number): number | null {
  if (raw === null) return fallback;
  if (!/^\d{1,3}$/.test(raw)) return null;
  const value = Number(raw);
  return value >= 1 && value <= MAX_LIMIT ? value : null;
}

async function folderPaths(db: Db, userId: string): Promise<Map<string, string>> {
  const paths = buildFolderPaths(await listFolders(db, userId));
  return new Map([...paths].map(([id, path]) => [id, formatFolderPath(path)]));
}

function toApiNote(
  note: { id: string; title: string; folderId: string; updatedAt: Date },
  paths: Map<string, string>,
  basePath: string,
): ApiNote {
  return {
    id: note.id,
    title: note.title,
    folderPath: paths.get(note.folderId) ?? '',
    updatedAt: note.updatedAt.toISOString(),
    path: `${basePath}${explorerHref({ folderId: note.folderId, note: note.id })}`,
  };
}

export async function listNotesHandler(request: Request, deps: ApiDeps): Promise<Response> {
  const user = await authenticate(request, deps);
  if (user instanceof Response) return user;
  const limit = parseLimit(new URL(request.url).searchParams.get('limit'), 10);
  if (limit === null) return invalidRequest();
  const [rows, paths] = await Promise.all([
    listRecentNoteRows(deps.db, user.id, limit),
    folderPaths(deps.db, user.id),
  ]);
  return json({ notes: rows.map((row) => toApiNote(row, paths, deps.basePath)) });
}

export async function searchHandler(request: Request, deps: ApiDeps): Promise<Response> {
  const user = await authenticate(request, deps);
  if (user instanceof Response) return user;
  const params = new URL(request.url).searchParams;
  const query = params.get('q') ?? '';
  const limit = parseLimit(params.get('limit'), 20);
  if (limit === null || query.trim().length === 0 || query.length > MAX_QUERY_LENGTH) {
    return invalidRequest();
  }
  const [hits, paths] = await Promise.all([
    searchNotes(deps.db, user.id, query, {}, limit),
    folderPaths(deps.db, user.id),
  ]);
  const notes: ApiSearchNote[] = hits.map((hit) => ({
    ...toApiNote(hit, paths, deps.basePath),
    excerpt: hit.excerpt.replaceAll(HIGHLIGHT_START, '').replaceAll(HIGHLIGHT_END, ''),
  }));
  return json({ notes });
}

const entryBody = z.object({ content: entryContent });

export async function createEntryHandler(request: Request, deps: ApiDeps): Promise<Response> {
  const user = await authenticate(request, deps);
  if (user instanceof Response) return user;
  const parsed = entryBody.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return invalidRequest();
  const entry = await submitEntry(deps.db, user.id, parsed.data.content, deps.queue);
  return json({ id: entry.id }, 201);
}
