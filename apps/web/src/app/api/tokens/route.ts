import { z } from 'zod';
import { createPersonalToken } from '@palanotes/db';
import { TOKEN_NAME_MAX, toTokenView } from '@/lib/token-view';
import { getCurrentUser } from '@/server/auth';
import { getDb } from '@/server/db';

export const dynamic = 'force-dynamic';

const body = z.object({ name: z.string().trim().min(1).max(TOKEN_NAME_MAX) });

// Creates a personal token for the signed-in account. The answer is the only time the
// token itself is sent.
export async function POST(request: Request): Promise<Response> {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ error: 'unauthorized' }, { status: 401 });
  }
  const parsed = body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json(
      {
        error: 'bad_request',
        message: `Donne-lui un nom de ${TOKEN_NAME_MAX} caractères au plus.`,
      },
      { status: 400 },
    );
  }
  const { token, record } = await createPersonalToken(getDb(), user.id, parsed.data.name);
  return Response.json(
    { token, record: toTokenView(record) },
    { status: 201, headers: { 'cache-control': 'no-store' } },
  );
}
