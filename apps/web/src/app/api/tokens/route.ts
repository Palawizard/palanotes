import { getCurrentUser } from '@/server/auth';
import { getDb } from '@/server/db';
import { createTokenHandler } from '@/server/token-routes';

export const dynamic = 'force-dynamic';

export async function POST(request: Request): Promise<Response> {
  return createTokenHandler(request, await getCurrentUser(), getDb());
}
