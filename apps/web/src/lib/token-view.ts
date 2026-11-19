import type { PersonalToken } from '@palanotes/db';

export const TOKEN_NAME_MAX = 60;

// A personal token as the settings page shows it: never the token itself.
export interface TokenView {
  id: string;
  name: string;
  createdAt: string;
  lastUsedAt: string | null;
}

export function toTokenView(token: PersonalToken): TokenView {
  return {
    id: token.id,
    name: token.name,
    createdAt: token.createdAt.toISOString(),
    lastUsedAt: token.lastUsedAt?.toISOString() ?? null,
  };
}
