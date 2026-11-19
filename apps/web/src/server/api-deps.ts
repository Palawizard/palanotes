import 'server-only';
import type { ApiDeps } from './api-v1';
import { getConfig } from './config';
import { getDb } from './db';
import { queueSortEntry } from './queue';
import { RateLimiter } from './rate-limit';

// One limiter for the three routes, kept on globalThis so every route bundle shares it.
const globalForApi = globalThis as unknown as { palanotesApiLimiter?: RateLimiter };

export function apiDeps(): ApiDeps {
  globalForApi.palanotesApiLimiter ??= new RateLimiter(60, 60_000);
  return {
    db: getDb(),
    basePath: getConfig().basePath,
    queue: queueSortEntry,
    limiter: globalForApi.palanotesApiLimiter,
  };
}
