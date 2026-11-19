import { afterAll, describe, expect, it } from 'vitest';
import { closeDb } from '../src/client';
import { deleteUserBySubject } from '../src/repo/users';
import {
  authenticatePersonalToken,
  createPersonalToken,
  generatePersonalToken,
  hashPersonalToken,
  isPersonalTokenFormat,
  listPersonalTokens,
  PERSONAL_TOKEN_LIMIT,
  PersonalTokenLimitError,
  revokePersonalToken,
} from '../src/repo/personal-tokens';
import { personalTokens } from '../src/schema';
import { createTestDb, createTestUser } from './db';

const db = createTestDb();
afterAll(() => closeDb(db));

describe('personal token format', () => {
  it('is pn_ followed by 32 random bytes in base64url', () => {
    const token = generatePersonalToken();
    expect(token).toMatch(/^pn_[A-Za-z0-9_-]{43}$/);
    expect(Buffer.from(token.slice(3), 'base64url')).toHaveLength(32);
    expect(generatePersonalToken()).not.toBe(token);
    expect(isPersonalTokenFormat(token)).toBe(true);
    expect(isPersonalTokenFormat(`${token}x`)).toBe(false);
    expect(isPersonalTokenFormat(token.replace('pn_', 'xx_'))).toBe(false);
  });

  it('hashes with SHA-256 in hex', () => {
    expect(hashPersonalToken('abc')).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    );
  });
});

describe('personal tokens', () => {
  it('stores only the hash and finds the account from the token', async () => {
    const user = await createTestUser(db, 'Alice');
    const { token, record } = await createPersonalToken(db, user.id, 'Tableau de bord');
    expect(record.name).toBe('Tableau de bord');
    expect(record.lastUsedAt).toBeNull();

    const stored = await db.select().from(personalTokens);
    const row = stored.find((item) => item.id === record.id);
    expect(row?.tokenHash).toBe(hashPersonalToken(token));
    expect(JSON.stringify(stored)).not.toContain(token);

    const found = await authenticatePersonalToken(db, token);
    expect(found?.tokenId).toBe(record.id);
    expect(found?.user.id).toBe(user.id);
  });

  it('refuses unknown and malformed tokens', async () => {
    expect(await authenticatePersonalToken(db, generatePersonalToken())).toBeNull();
    expect(await authenticatePersonalToken(db, 'pn_short')).toBeNull();
    expect(await authenticatePersonalToken(db, '')).toBeNull();
  });

  it('records the last use at most once a minute', async () => {
    const user = await createTestUser(db);
    const { token, record } = await createPersonalToken(db, user.id, 'Lecture');
    const first = new Date('2026-11-19T10:00:00Z');
    await authenticatePersonalToken(db, token, first);
    await authenticatePersonalToken(db, token, new Date('2026-11-19T10:00:30Z'));
    let [listed] = await listPersonalTokens(db, user.id);
    expect(listed?.id).toBe(record.id);
    expect(listed?.lastUsedAt?.toISOString()).toBe(first.toISOString());

    await authenticatePersonalToken(db, token, new Date('2026-11-19T10:01:30Z'));
    [listed] = await listPersonalTokens(db, user.id);
    expect(listed?.lastUsedAt?.toISOString()).toBe('2026-11-19T10:01:30.000Z');
  });

  it('lists the account own tokens, newest first, and revokes only its own', async () => {
    const alice = await createTestUser(db, 'Alice');
    const bob = await createTestUser(db, 'Bob');
    const older = await createPersonalToken(db, alice.id, 'Premier');
    const newer = await createPersonalToken(db, alice.id, 'Second');
    const bobs = await createPersonalToken(db, bob.id, 'Celui de Bob');

    expect((await listPersonalTokens(db, alice.id)).map((item) => item.name)).toEqual([
      'Second',
      'Premier',
    ]);
    expect(await revokePersonalToken(db, alice.id, bobs.record.id)).toBe(false);
    expect(await authenticatePersonalToken(db, bobs.token)).not.toBeNull();

    expect(await revokePersonalToken(db, alice.id, older.record.id)).toBe(true);
    expect(await authenticatePersonalToken(db, older.token)).toBeNull();
    expect(await authenticatePersonalToken(db, newer.token)).not.toBeNull();
    expect((await listPersonalTokens(db, alice.id)).map((item) => item.name)).toEqual(['Second']);
  });

  it('refuses an eleventh token, also when several are created at once', async () => {
    const user = await createTestUser(db);
    const attempts = await Promise.allSettled(
      Array.from({ length: PERSONAL_TOKEN_LIMIT + 3 }, (_, index) =>
        createPersonalToken(db, user.id, `Jeton ${index}`),
      ),
    );
    expect(attempts.filter((attempt) => attempt.status === 'fulfilled')).toHaveLength(
      PERSONAL_TOKEN_LIMIT,
    );
    const refused = attempts.filter((attempt) => attempt.status === 'rejected');
    expect(refused).toHaveLength(3);
    for (const attempt of refused) {
      expect((attempt as PromiseRejectedResult).reason).toBeInstanceOf(PersonalTokenLimitError);
    }
    expect(await listPersonalTokens(db, user.id)).toHaveLength(PERSONAL_TOKEN_LIMIT);

    const [oldest] = (await listPersonalTokens(db, user.id)).slice(-1);
    await revokePersonalToken(db, user.id, oldest?.id ?? '');
    await expect(createPersonalToken(db, user.id, 'Après révocation')).resolves.toBeTruthy();
  });

  it('goes away with the account', async () => {
    const user = await createTestUser(db);
    const { token } = await createPersonalToken(db, user.id, 'Temporaire');
    await deleteUserBySubject(db, user.authSubject);
    expect(await authenticatePersonalToken(db, token)).toBeNull();
  });
});
