import { emptyTrash } from '@palanotes/db';
import { getCurrentUser } from '@/server/auth';
import { getDb } from '@/server/db';

export const dynamic = 'force-dynamic';

// Empties the whole trash of the account, for good.
export async function DELETE(): Promise<Response> {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ error: 'unauthorized' }, { status: 401 });
  }
  return Response.json({ removed: await emptyTrash(getDb(), user.id) });
}
