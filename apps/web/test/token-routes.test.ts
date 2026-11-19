import { afterAll, describe, expect, it } from 'vitest';
import {
  authenticatePersonalToken,
  closeDb,
  createPersonalToken,
  listPersonalTokens,
  PERSONAL_TOKEN_LIMIT,
} from '@palanotes/db';
import { createTestDb, createTestUser } from '@palanotes/db/testing';
import { createTokenHandler, revokeTokenHandler } from '@/server/token-routes';
import { TEST_DB } from './global-setup';

const db = createTestDb(TEST_DB);
afterAll(() => closeDb(db));

function create(body: unknown): Request {
  return new Request('http://localhost:3100/notes/api/tokens', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

describe('POST /api/tokens', () => {
  it('creates a token for the signed-in account and sends it once', async () => {
    const user = await createTestUser(db);
    const response = await createTokenHandler(create({ name: '  Tableau de bord  ' }), user, db);
    expect(response.status).toBe(201);
    const body = (await response.json()) as { token: string; record: { name: string } };
    expect(body.record.name).toBe('Tableau de bord');
    expect((await authenticatePersonalToken(db, body.token))?.user.id).toBe(user.id);
  });

  it('refuses a request without a session', async () => {
    expect((await createTokenHandler(create({ name: 'x' }), null, db)).status).toBe(401);
  });

  it('says when the name is too long, and stays generic otherwise', async () => {
    const user = await createTestUser(db);
    const tooLong = await createTokenHandler(create({ name: 'a'.repeat(61) }), user, db);
    expect(tooLong.status).toBe(400);
    expect(await tooLong.json()).toEqual({
      error: 'bad_request',
      message: 'Donne-lui un nom de 60 caractères au plus.',
    });
    for (const body of [{}, { name: '' }, { name: '   ' }, { name: 3 }, 'not json']) {
      const response = await createTokenHandler(create(body), user, db);
      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({
        error: 'bad_request',
        message: 'Donne un nom au jeton.',
      });
    }
    expect(await listPersonalTokens(db, user.id)).toEqual([]);
  });

  it('refuses an eleventh token with a message for the user', async () => {
    const user = await createTestUser(db);
    for (let index = 0; index < PERSONAL_TOKEN_LIMIT; index += 1) {
      await createPersonalToken(db, user.id, `Jeton ${index}`);
    }
    const response = await createTokenHandler(create({ name: 'Un de trop' }), user, db);
    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      error: 'too_many_tokens',
      message: 'Tu as déjà 10 jetons : révoque-en un avant d’en créer un autre.',
    });
  });
});

describe('DELETE /api/tokens/<id>', () => {
  it('revokes a token of the account', async () => {
    const user = await createTestUser(db);
    const { token, record } = await createPersonalToken(db, user.id, 'À révoquer');
    const response = await revokeTokenHandler(record.id, user, db);
    expect(response.status).toBe(204);
    expect(await authenticatePersonalToken(db, token)).toBeNull();
  });

  it('answers 404 for an unknown id, a malformed id or another account token', async () => {
    const alice = await createTestUser(db, 'Alice');
    const bob = await createTestUser(db, 'Bob');
    const bobs = await createPersonalToken(db, bob.id, 'Celui de Bob');
    for (const id of ['6f1c2b9e-3d4a-4c8b-9e2f-1a2b3c4d5e6f', 'not-an-id', bobs.record.id]) {
      const response = await revokeTokenHandler(id, alice, db);
      expect(response.status).toBe(404);
      expect(await response.json()).toEqual({
        error: 'not_found',
        message: 'Ce jeton n’existe plus.',
      });
    }
    expect(await authenticatePersonalToken(db, bobs.token)).not.toBeNull();
  });

  it('refuses a request without a session', async () => {
    const user = await createTestUser(db);
    const { record } = await createPersonalToken(db, user.id, 'Gardé');
    expect((await revokeTokenHandler(record.id, null, db)).status).toBe(401);
    expect(await listPersonalTokens(db, user.id)).toHaveLength(1);
  });
});
