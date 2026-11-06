import 'server-only';
import { cache } from 'react';
import { cookies } from 'next/headers';
import { findUserById, type User } from '@palanotes/db';
import { getConfig } from './config';
import { getDb } from './db';
import { readSessionToken, SESSION_COOKIE } from './session-token';

// Secure check: the signed cookie must point to an existing account. Pages and route
// handlers call this themselves instead of trusting the proxy's optimistic check.
export const getCurrentUser = cache(async (): Promise<User | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const session = await readSessionToken(token, getConfig().sessionSecret);
  if (!session) {
    return null;
  }
  const user = await findUserById(getDb(), session.userId);
  return user && user.authSubject === session.subject ? user : null;
});
