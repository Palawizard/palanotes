import { eq, sql } from 'drizzle-orm';
import type { DbOrTx } from '../client.js';
import { users } from '../schema.js';

export type User = typeof users.$inferSelect;
export type SortMode = User['sortMode'];

export async function upsertUser(
  db: DbOrTx,
  input: { authSubject: string; displayName: string },
): Promise<User> {
  const [user] = await db
    .insert(users)
    .values(input)
    .onConflictDoUpdate({
      target: users.authSubject,
      set: { displayName: input.displayName, updatedAt: sql`now()` },
    })
    .returning();
  if (!user) {
    throw new Error('user upsert returned no row');
  }
  return user;
}

export async function findUserById(db: DbOrTx, id: string): Promise<User | null> {
  const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return user ?? null;
}

export async function setSortMode(db: DbOrTx, userId: string, sortMode: SortMode): Promise<void> {
  await db
    .update(users)
    .set({ sortMode, updatedAt: sql`now()` })
    .where(eq(users.id, userId));
}
