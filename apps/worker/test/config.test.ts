import { describe, expect, it } from 'vitest';
import { createLlmClient, resolveLlmMode } from '@palanotes/llm';
import { readConfig } from '../src/config';

const base = { DATABASE_URL: 'postgres://x', LLM_OWNER_SUBJECT: 'owner-sub' };

describe('worker config', () => {
  it('refuses the fake model in production', () => {
    expect(() => readConfig({ ...base, NODE_ENV: 'production', LLM_FAKE: '1' })).toThrow();
  });

  it('never gives another account the subscription, even when configured to', () => {
    const config = readConfig({
      ...base,
      LLM_OWNER_MODE: 'subscription',
      LLM_DEFAULT_MODE: 'api',
      CLAUDE_CODE_OAUTH_TOKEN: 'oauth',
    });
    expect(createLlmClient(resolveLlmMode('owner-sub', config.mode), config.llm).client?.mode).toBe(
      'subscription',
    );
    const other = createLlmClient(resolveLlmMode('someone-else', config.mode), config.llm);
    expect(other.client).toBeNull();
    expect(other.reason).toBe('Le rangement n’est pas encore configuré sur le serveur.');
  });

  it('disables filing for other accounts by default', () => {
    const config = readConfig(base);
    expect(createLlmClient(resolveLlmMode('someone-else', config.mode), config.llm).reason).toBe(
      'Le rangement automatique n’est pas activé pour ce compte.',
    );
  });
});
