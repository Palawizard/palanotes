import { getCurrentUser } from '@/server/auth';
import { getDb } from '@/server/db';
import { revokeTokenHandler } from '@/server/token-routes';

export const dynamic = 'force-dynamic';

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  return revokeTokenHandler((await context.params).id, await getCurrentUser(), getDb());
}
