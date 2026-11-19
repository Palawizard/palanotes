import { z } from 'zod';
import {
  createPersonalToken,
  PERSONAL_TOKEN_LIMIT,
  PersonalTokenLimitError,
  revokePersonalToken,
  type Db,
  type User,
} from '@palanotes/db';
import { TOKEN_NAME_MAX, toTokenView } from '@/lib/token-view';

// Settings routes for personal tokens, with the session's account passed in so they can be
// tested without a request scope.

const body = z.object({ name: z.string().trim().min(1).max(TOKEN_NAME_MAX) });

const unauthorized = (): Response => Response.json({ error: 'unauthorized' }, { status: 401 });

// The answer is the only time the token itself is sent.
export async function createTokenHandler(
  request: Request,
  user: User | null,
  db: Db,
): Promise<Response> {
  if (!user) return unauthorized();
  const parsed = body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    const tooLong = parsed.error.issues.some((issue) => issue.code === 'too_big');
    return Response.json(
      {
        error: 'bad_request',
        message: tooLong
          ? `Donne-lui un nom de ${TOKEN_NAME_MAX} caractères au plus.`
          : 'Donne un nom au jeton.',
      },
      { status: 400 },
    );
  }
  try {
    const { token, record } = await createPersonalToken(db, user.id, parsed.data.name);
    return Response.json(
      { token, record: toTokenView(record) },
      { status: 201, headers: { 'cache-control': 'no-store' } },
    );
  } catch (error) {
    if (error instanceof PersonalTokenLimitError) {
      return Response.json(
        {
          error: 'too_many_tokens',
          message: `Tu as déjà ${PERSONAL_TOKEN_LIMIT} jetons : révoque-en un avant d’en créer un autre.`,
        },
        { status: 409 },
      );
    }
    throw error;
  }
}

// The other app loses its access at once.
export async function revokeTokenHandler(
  rawId: string,
  user: User | null,
  db: Db,
): Promise<Response> {
  if (!user) return unauthorized();
  const id = z.uuid().safeParse(rawId);
  if (!id.success || !(await revokePersonalToken(db, user.id, id.data))) {
    return Response.json(
      { error: 'not_found', message: 'Ce jeton n’existe plus.' },
      { status: 404 },
    );
  }
  return new Response(null, { status: 204 });
}
