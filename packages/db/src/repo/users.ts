import { eq, sql } from 'drizzle-orm';
import type { DbOrTx } from '../client';
import { users } from '../schema';

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

export interface AccountSummary {
  authSubject: string;
  displayName: string;
  noteCount: number;
  lastActivity: Date;
}

export async function listAccounts(db: DbOrTx): Promise<AccountSummary[]> {
  const rows = await db.execute(sql`
    select u.auth_subject, u.display_name,
           (select count(*)::int from notes n where n.user_id = u.id) as note_count,
           greatest(u.updated_at,
                    coalesce((select max(e.created_at) from entries e where e.user_id = u.id), u.updated_at)) as last_activity
    from users u
    order by u.created_at
  `);
  return (rows as unknown as Record<string, unknown>[]).map((row) => ({
    authSubject: String(row.auth_subject),
    displayName: String(row.display_name),
    noteCount: Number(row.note_count),
    lastActivity: new Date(String(row.last_activity)),
  }));
}

// Deletes the account; folders, entries, notes, plans and versions follow by cascade.
export async function deleteUserBySubject(db: DbOrTx, authSubject: string): Promise<boolean> {
  const deleted = await db
    .delete(users)
    .where(eq(users.authSubject, authSubject))
    .returning({ id: users.id });
  return deleted.length > 0;
}
