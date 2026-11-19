import { apiDeps } from '@/server/api-deps';
import { searchHandler } from '@/server/api-v1';

export const dynamic = 'force-dynamic';

export function GET(request: Request): Promise<Response> {
  return searchHandler(request, apiDeps());
}
