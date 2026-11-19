import { createHash, randomBytes } from 'node:crypto';
import { and, desc, eq, isNull, lt, or, sql } from 'drizzle-orm';
import type { DbOrTx } from '../client';
import { personalTokens, users } from '../schema';
import type { User } from './users';

export const PERSONAL_TOKEN_PREFIX = 'pn_';
// `pn_` then 32 random bytes in base64url (43 characters, no padding).
const TOKEN_PATTERN = /^pn_[A-Za-z0-9_-]{43}$/;
// Writing the last use on every request would turn each read into a write.
const LAST_USED_PRECISION_MS = 60_000;

export interface PersonalToken {
  id: string;
  name: string;
  createdAt: Date;
  lastUsedAt: Date | null;
}

export function generatePersonalToken(): string {
  return `${PERSONAL_TOKEN_PREFIX}${randomBytes(32).toString('base64url')}`;
}

export function hashPersonalToken(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex');
}

export function isPersonalTokenFormat(value: string): boolean {
  return TOKEN_PATTERN.test(value);
}

const columns = {
  id: personalTokens.id,
  name: personalTokens.name,
  createdAt: personalTokens.createdAt,
  lastUsedAt: personalTokens.lastUsedAt,
};

// Returns the token in clear once; only its hash is stored.
export async function createPersonalToken(
  db: DbOrTx,
  userId: string,
  name: string,
): Promise<{ token: string; record: PersonalToken }> {
  const token = generatePersonalToken();
  const [record] = await db
    .insert(personalTokens)
    .values({ userId, name, tokenHash: hashPersonalToken(token) })
    .returning(columns);
  if (!record) {
    throw new Error('personal token insert returned no row');
  }
  return { token, record };
}

export async function listPersonalTokens(db: DbOrTx, userId: string): Promise<PersonalToken[]> {
  return db
    .select(columns)
    .from(personalTokens)
    .where(eq(personalTokens.userId, userId))
    .orderBy(desc(personalTokens.createdAt));
}

// A revoked token is deleted: nothing can be done with its row afterwards.
export async function revokePersonalToken(
  db: DbOrTx,
  userId: string,
  tokenId: string,
): Promise<boolean> {
  const deleted = await db
    .delete(personalTokens)
    .where(and(eq(personalTokens.id, tokenId), eq(personalTokens.userId, userId)))
    .returning({ id: personalTokens.id });
  return deleted.length > 0;
}

// The account a token belongs to, or null for a malformed, unknown or revoked token.
export async function authenticatePersonalToken(
  db: DbOrTx,
  token: string,
  now = new Date(),
): Promise<{ tokenId: string; user: User } | null> {
  if (!isPersonalTokenFormat(token)) {
    return null;
  }
  const [row] = await db
    .select({ tokenId: personalTokens.id, user: users })
    .from(personalTokens)
    .innerJoin(users, eq(users.id, personalTokens.userId))
    .where(eq(personalTokens.tokenHash, hashPersonalToken(token)))
    .limit(1);
  if (!row) {
    return null;
  }
  await db
    .update(personalTokens)
    .set({ lastUsedAt: sql`${now.toISOString()}::timestamptz` })
    .where(
      and(
        eq(personalTokens.id, row.tokenId),
        or(
          isNull(personalTokens.lastUsedAt),
          lt(
            personalTokens.lastUsedAt,
            sql`${new Date(now.getTime() - LAST_USED_PRECISION_MS).toISOString()}::timestamptz`,
          ),
        ),
      ),
    );
  return row;
}
