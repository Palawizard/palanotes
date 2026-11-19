import { apiDeps } from '@/server/api-deps';
import { createEntryHandler } from '@/server/api-v1';

export const dynamic = 'force-dynamic';

export function POST(request: Request): Promise<Response> {
  return createEntryHandler(request, apiDeps());
}
