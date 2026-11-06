import { ApiLlmClient } from './api-client';
import { CliLlmClient } from './cli-client';
import { FakeLlmClient } from './fake-client';
import type { LlmClient, LlmMode } from './types';

export const DEFAULT_MODEL = 'claude-haiku-5-5';

export interface LlmEnvironment {
  model?: string | undefined;
  apiKey?: string | undefined;
  oauthToken?: string | undefined;
  fake?: boolean;
  cliCommand?: string | undefined;
  cliConfigDir?: string | undefined;
}

export type LlmClientResult =
  { client: LlmClient; reason?: undefined } | { client: null; reason: string };

export function createLlmClient(mode: LlmMode, env: LlmEnvironment): LlmClientResult {
  const model = env.model || DEFAULT_MODEL;
  if (mode === 'disabled') {
    return { client: null, reason: 'Le rangement automatique n’est pas activé pour ce compte.' };
  }
  if (env.fake) {
    return { client: new FakeLlmClient() };
  }
  if (mode === 'subscription') {
    return env.oauthToken
      ? {
          client: new CliLlmClient(env.oauthToken, model, {
            ...(env.cliCommand ? { command: env.cliCommand } : {}),
            ...(env.cliConfigDir ? { configDir: env.cliConfigDir } : {}),
          }),
        }
      : { client: null, reason: 'Le rangement n’est pas encore configuré sur le serveur.' };
  }
  return env.apiKey
    ? { client: new ApiLlmClient(env.apiKey, model) }
    : { client: null, reason: 'Le rangement n’est pas encore configuré sur le serveur.' };
}
