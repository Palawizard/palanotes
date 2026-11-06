import { z } from 'zod';
import type { LlmEnvironment, LlmModeConfig } from '@palanotes/llm';

const schema = z.object({
  DATABASE_URL: z.string().min(1),
  NODE_ENV: z.string().default('development'),
  LLM_OWNER_SUBJECT: z.string().optional(),
  LLM_OWNER_MODE: z.enum(['subscription', 'api', 'disabled']).default('subscription'),
  LLM_DEFAULT_MODE: z.enum(['api', 'disabled']).default('disabled'),
  LLM_MODEL: z.string().optional(),
  LLM_FAKE: z.enum(['0', '1']).default('0'),
  CLAUDE_CODE_OAUTH_TOKEN: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
  CLAUDE_CLI_PATH: z.string().optional(),
  CLAUDE_CLI_CONFIG_DIR: z.string().optional(),
});

export interface WorkerConfig {
  databaseUrl: string;
  mode: LlmModeConfig;
  llm: LlmEnvironment;
}

export function readConfig(env: NodeJS.ProcessEnv): WorkerConfig {
  const parsed = schema.parse(env);
  const fake = parsed.LLM_FAKE === '1';
  if (fake && parsed.NODE_ENV === 'production') {
    throw new Error('LLM_FAKE cannot be used in production');
  }
  return {
    databaseUrl: parsed.DATABASE_URL,
    mode: {
      ownerSubject: parsed.LLM_OWNER_SUBJECT || null,
      ownerMode: parsed.LLM_OWNER_MODE,
      defaultMode: parsed.LLM_DEFAULT_MODE,
    },
    llm: {
      model: parsed.LLM_MODEL || undefined,
      apiKey: parsed.ANTHROPIC_API_KEY || undefined,
      oauthToken: parsed.CLAUDE_CODE_OAUTH_TOKEN || undefined,
      fake,
      cliCommand: parsed.CLAUDE_CLI_PATH || undefined,
      cliConfigDir: parsed.CLAUDE_CLI_CONFIG_DIR || undefined,
    },
  };
}
