export const E2E_PORT = 3100;
export const E2E_OIDC_PORT = 9400;
export const E2E_SUBJECT = 'e2e-owner-subject';

export const e2eEnv: Record<string, string> = {
  DATABASE_URL:
    process.env.E2E_DATABASE_URL ?? 'postgres://palanotes:palanotes@localhost:5434/palanotes_e2e',
  PUBLIC_URL: `http://localhost:${E2E_PORT}`,
  BASE_PATH: '/notes',
  SESSION_SECRET: 'e2e-session-secret-that-is-long-enough',
  OIDC_ISSUER: `http://localhost:${E2E_OIDC_PORT}`,
  OIDC_CLIENT_ID: 'palanotes',
  OIDC_CLIENT_SECRET: 'e2e-secret',
  OIDC_REDIRECT_URI: `http://localhost:${E2E_PORT}/notes/api/auth/callback`,
  LLM_OWNER_SUBJECT: E2E_SUBJECT,
};
