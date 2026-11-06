import { z } from 'zod';

const llmMode = z.enum(['subscription', 'api', 'disabled']);

const schema = z.object({
  DATABASE_URL: z.string().min(1),
  PUBLIC_URL: z.url(),
  BASE_PATH: z.string().default('/notes'),
  SESSION_SECRET: z.string().min(32, 'SESSION_SECRET must be at least 32 characters'),
  OIDC_ISSUER: z.url(),
  OIDC_CLIENT_ID: z.string().min(1),
  OIDC_CLIENT_SECRET: z.string().min(1),
  OIDC_REDIRECT_URI: z.url(),
  LLM_OWNER_SUBJECT: z.string().optional(),
  LLM_OWNER_MODE: llmMode.default('subscription'),
  LLM_DEFAULT_MODE: z.enum(['api', 'disabled']).default('disabled'),
});

export interface AppConfig {
  databaseUrl: string;
  publicOrigin: string;
  basePath: string;
  sessionSecret: string;
  secureCookies: boolean;
  oidc: { issuer: string; clientId: string; clientSecret: string; redirectUri: string };
}

let cached: AppConfig | null = null;

// Read lazily so `next build` works without the runtime secrets.
export function getConfig(): AppConfig {
  if (cached) {
    return cached;
  }
  const env = schema.parse(process.env);
  const publicUrl = new URL(env.PUBLIC_URL);
  cached = {
    databaseUrl: env.DATABASE_URL,
    publicOrigin: publicUrl.origin,
    basePath: env.BASE_PATH,
    sessionSecret: env.SESSION_SECRET,
    secureCookies: publicUrl.protocol === 'https:' || publicUrl.hostname === 'localhost',
    oidc: {
      issuer: env.OIDC_ISSUER,
      clientId: env.OIDC_CLIENT_ID,
      clientSecret: env.OIDC_CLIENT_SECRET,
      redirectUri: env.OIDC_REDIRECT_URI,
    },
  };
  return cached;
}
