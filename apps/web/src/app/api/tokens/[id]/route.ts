import { z } from 'zod';
import { revokePersonalToken } from '@palanotes/db';
import { getCurrentUser } from '@/server/auth';
import { getDb } from '@/server/db';

export const dynamic = 'force-dynamic';

// Revokes one of the account's personal tokens: the other app loses its access at once.
export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ error: 'unauthorized' }, { status: 401 });
  }
  const id = z.uuid().safeParse((await context.params).id);
  if (!id.success || !(await revokePersonalToken(getDb(), user.id, id.data))) {
    return Response.json(
      { error: 'not_found', message: 'Ce jeton n’existe plus.' },
      { status: 404 },
    );
  }
  return new Response(null, { status: 204 });
}
