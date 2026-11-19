import { apiDeps } from '@/server/api-deps';
import { listNotesHandler } from '@/server/api-v1';

export const dynamic = 'force-dynamic';

export function GET(request: Request): Promise<Response> {
  return listNotesHandler(request, apiDeps());
}
